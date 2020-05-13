import {
  DispatchableEvent,
  createEvent,
  TaskDispatcherEvent,
  emit,
  hasListeners,
} from "../events";
import { Logger, getLogger } from "../utils/logger";

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

  private _name: string;
  private _executionHistory: Set<string>;
  private _cancelFunctions: Map<string, CancelFunction>;

  private _logger: Logger;

  constructor(name: string, taskConfig: TaskConfig = {}) {
    this._name = name;
    this._executionHistory = new Set();
    this._cancelFunctions = new Map();

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
    if (this._invocationEvent && !this.isDone()) {
      this.cancelParallelInvocation(taskParams, invocationEvent);

      return;
    }

    this._taskParams = taskParams;
    this._invocationEvent = invocationEvent;

    this.log(`Run triggered by ${invocationEvent.name} event`);

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
        )} and invocation event ${JSON.stringify(invocationEvent)}: ${err}`
      );

      this.emitEndEvent(TaskResultStatus.Error, err);
      throw err;
    }

    this.removeCancelFunction();
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
    this.emitEndEvent(TaskResultStatus.Cancelled);

    if (this._cancelFunctions.has(this._invocationEvent.id)) {
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
      `${message} (invocationId=${this._invocationEvent.id})`
    );
  }

  private configureTask(taskConfig: TaskConfig) {
    this._taskConfig = {
      foreground: taskConfig.foreground ? true : false,
      outputEventNames:
        taskConfig.outputEventNames && taskConfig.outputEventNames.length > 0
          ? taskConfig.outputEventNames
          : [`${this.name}Finished`],
    };
  }

  private cancelParallelInvocation(
    taskParams: TaskParams,
    invocationEvent: DispatchableEvent
  ) {
    this.getLogger().warn(
      `Multiple executions of a task cannot run concurrently. Warning triggered with: params=${JSON.stringify(
        taskParams
      )} and invocationEvent=${JSON.stringify(invocationEvent)}`
    );

    const reason = new Error(
      "Concurrent Execution: Executing multiple instances of a task concurrently is not allowed"
    );
    this.emitEndEvent(TaskResultStatus.Cancelled, reason, invocationEvent.id);
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
        ? { ...result }
        : { result }
      : {};

    emit({
      name: eventName,
      id: this._invocationEvent.id,
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

    const result: TaskChainResult = { status };
    if (err) {
      result.reason = err;
    }

    const endEvent = createEvent(TaskDispatcherEvent.TaskChainFinished, {
      id,
      data: {
        result,
      },
    });
    emit(endEvent);
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

export interface TaskChainResult {
  status: TaskResultStatus;
  reason?: Error;
}

export enum TaskResultStatus {
  Ok = "ok",
  Error = "error",
  Cancelled = "cancelled",
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
