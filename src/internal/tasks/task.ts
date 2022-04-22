import { DispatchableEvent, emit, hasListeners } from "../events";
import AwaitLock from "await-lock";
import { Logger, getLogger } from "../utils/logger";
import { TaskChain, TaskResultStatus } from "./task-chain";
import { now } from "../utils/time";
import { flatten } from "../utils/serialization";

export abstract class Task {
  get name(): string {
    return this._name;
  }

  get outputEventNames(): Array<string> {
    return this._taskConfig.outputEventNames;
  }

  private _taskConfig: TaskConfig;
  private _taskParams: TaskParams;
  private _invocationEvent: DispatchableEvent;

  private readonly _name: string;
  private readonly _inQueue: Set<string>;
  private readonly _executionHistory: Set<string>;
  private readonly _cancelFunctions: Map<string, CancelFunction>;
  private readonly _executionLock: AwaitLock;

  private _logger: Logger;

  constructor(name: string, taskConfig: TaskConfig = {}) {
    this._name = name;
    this._inQueue = new Set();
    this._executionHistory = new Set();
    this._cancelFunctions = new Map();
    this._executionLock = new AwaitLock();

    this.configureTask(taskConfig);
  }

  /**
   * To be called by the task runner. Performs pre-execution checks and runs the task.
   * @param taskParams The runtime parameters of the task
   * @param invocationEvent The event causing the task to be executed
   */
  async run(
    taskParams: TaskParams,
    invocationEvent: DispatchableEvent
  ): Promise<void> {
    this._inQueue.add(invocationEvent.id);
    await this._executionLock.acquireAsync();

    this._taskParams = taskParams;
    this._invocationEvent = invocationEvent;

    if (this.isDone()) {
      this._executionLock.release();
      return;
    }

    this.log(
      `Run triggered by ${invocationEvent.name} event ${
        invocationEvent.expirationTimestamp !== -1
          ? `with ${invocationEvent.expirationTimestamp} expirationTimestamp`
          : ``
      }`
    );

    let executionError: Error;
    try {
      await this.checkIfCanRun();
      const outcome = await this.onRun(taskParams, invocationEvent);

      if (!this.isDone()) {
        this.processTaskOutcome(outcome);
      }
    } catch (err) {
      this.getLogger().error(
        `Execution failed with params ${JSON.stringify(
          taskParams
        )} and invocation event ${JSON.stringify(invocationEvent)}: ${
          err.stack ? err.stack : err
        }`
      );

      this.emitEndEvent(TaskResultStatus.Error, err);
      executionError = err;
    }

    this.removeCancelFunction();
    this._inQueue.delete(this._invocationEvent.id);
    this._executionLock.release();

    if (executionError) throw executionError;
  }

  /**
   * Indicates if a task runs in background (true by default). Can be configured at instantiation time.
   */
  runsInBackground(): boolean {
    return !this._taskConfig.foreground;
  }

  /**
   * Method to be called by the task runner if the task takes longer than expected to be
   * executed. Finishes the task chain and gracefully cancels the task through onCancel.
   */
  cancel(): void {
    for (const id of this._inQueue) {
      this.emitEndEvent(TaskResultStatus.Cancelled, undefined, id);
    }
    this._inQueue.clear();

    if (
      this._invocationEvent &&
      this._cancelFunctions.has(this._invocationEvent.id)
    ) {
      const cancelFunction = this._cancelFunctions.get(
        this._invocationEvent.id
      );
      cancelFunction();
      this.removeCancelFunction();
    }

    this.log("Cancelled");
  }

  /**
   * Runs task pre run checks (does nothing by default). Should be overridden if certain
   * conditions must be met. Exceptions are expected in case certain task precondition is not met.
   */
  checkIfCanRun(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Performs actions in order to prepare the task for execution. Should be overridden if certain
   * custom actions have to be done.
   */
  prepare(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Run the task again within a certain amount of time. WARNING: it won't work
   * if the amount of time is exactly the same than for the current run. In that
   * situation use a recurrent task instead.
   * @param seconds amount of seconds in which the task will be executed again
   * @param params optional parameters that will be passed to the task
   */
  protected runAgainIn(seconds: number, params?: TaskParams) {
    defer(this.name, seconds, params ? params : this._taskParams);
    this.log(`Will run again in ${seconds} s`);
  }

  /**
   * The content of the task to be executed
   */
  protected abstract onRun(
    taskParams: TaskParams,
    invocationEvent: DispatchableEvent
  ): Promise<void | TaskOutcome>;

  /**
   * Method to be called to inject a function in charge of cleaning up
   * resources on task cancellation
   */
  protected setCancelFunction(f: CancelFunction) {
    if (this.isDone()) {
      f();

      return;
    }
    this._cancelFunctions.set(this._invocationEvent.id, f);
  }

  /**
   * Meant to be used by the task itself. Logs should be printed through here.
   * @param message The message to be printed
   */
  protected log(message: any) {
    this.getLogger().info(
      `${message} (invocationId=${
        this._invocationEvent ? this._invocationEvent.id : "??"
      })`
    );
  }

  /**
   * Meant to be used by the task itself. Provides the amount of time until the timeout will fire.
   */
  protected remainingTime(): number {
    if (this._invocationEvent.expirationTimestamp === -1) {
      return -1;
    }

    let timeForExpiration = this._invocationEvent.expirationTimestamp - now();

    if (this.outputEventNames.some(hasListeners)) {
      timeForExpiration *= 0.9;
    }

    return Math.floor(timeForExpiration);
  }

  private configureTask(taskConfig: TaskConfig) {
    this._taskConfig = {
      foreground: taskConfig.foreground,
      outputEventNames:
        taskConfig.outputEventNames && taskConfig.outputEventNames.length > 0
          ? taskConfig.outputEventNames
          : [`${this.name}Finished`],
    };
  }

  private processTaskOutcome(outcome: void | TaskOutcome) {
    if (this.outputEventNames.length > 1 && (!outcome || !outcome.eventName)) {
      this.getLogger().error(
        `Task was declared to have more than one possible output event, but outcome did not specify any.
        Please, check if you forgot to fill eventName field in any of the outputs of your conditional branches.
        Received outcome: ${JSON.stringify(outcome)}`
      );

      const reason = new Error("Cannot choose which event to emit");
      this.emitEndEvent(TaskResultStatus.Error, reason);

      return;
    }

    const outputEvent =
      !outcome || !outcome.eventName
        ? this.outputEventNames[0]
        : outcome.eventName;

    if (!outcome || !outcome.result) {
      this.done(outputEvent);
    } else {
      this.done(outputEvent, outcome.result);
    }
  }

  private done(eventName: string, result?: any) {
    if (this.isDone()) {
      return;
    }
    this.markAsDone();

    if (!this.outputEventNames.find((name) => name === eventName)) {
      this.getLogger().warn(
        `About to emit an event (${eventName}) not declared in the list of possible output events of this task.
      This can lead to unintended behaviors. Perhaps you have forgot to include it in the task configuration or there is a typo`
      );
    }

    if (!hasListeners(eventName)) {
      this.emitEndEvent(TaskResultStatus.Ok);

      return;
    }

    const data = result
      ? typeof result === "object"
        ? flatten(result)
        : { result }
      : {};

    emit({
      name: eventName,
      id: this._invocationEvent.id,
      expirationTimestamp: this._invocationEvent.expirationTimestamp,
      data,
    });

    this.log(`Finished running with ${eventName} event`);
  }

  private isDone(): boolean {
    return this._executionHistory.has(this._invocationEvent.id);
  }

  private markAsDone(invocationId?: string) {
    const id = invocationId ? invocationId : this._invocationEvent.id;
    this._executionHistory.add(id);
  }

  private emitEndEvent(
    status: TaskResultStatus,
    err?: Error,
    invocationId?: string
  ): void {
    const id = invocationId ? invocationId : this._invocationEvent.id;
    this.markAsDone(id);

    TaskChain.finalize(id, status, err);
  }

  private removeCancelFunction() {
    this._cancelFunctions.delete(this._invocationEvent.id);
  }

  private getLogger() {
    if (!this._logger) {
      this._logger = getLogger(`Task (${this._name})`);
    }
    return this._logger;
  }
}

export interface TaskConfig {
  foreground?: boolean;
  outputEventNames?: Array<string>;
}

export interface TaskParams {
  [key: string]: any;
}

export interface TaskOutcome {
  eventName?: string;
  result?: any;
}

export type CancelFunction = () => void;
export type TaskDeferrer = (
  taskName: string,
  seconds: number,
  taskParams: TaskParams
) => void;

let defer: TaskDeferrer;
export function setTaskDeferrer(taskDeferrer: TaskDeferrer) {
  defer = taskDeferrer;
}
