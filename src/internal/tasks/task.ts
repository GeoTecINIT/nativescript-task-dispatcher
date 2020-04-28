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
    return this.taskConfig.outputEventNames;
  }

  protected taskParams: TaskParams;
  protected invocationEvent: DispatchableEvent;

  private _name: string;
  private _executionHistory: Set<string>;
  private _cancelFunctions: Map<string, CancelFunction>;

  private _logger: Logger;

  constructor(name: string, protected taskConfig: TaskConfig = {}) {
    this._name = name;
    this._executionHistory = new Set();
    this._cancelFunctions = new Map();

    if (!taskConfig.foreground) {
      taskConfig.foreground = false;
    }

    if (!taskConfig.outputEventNames) {
      taskConfig.outputEventNames = [`${name}Finished`];
    }
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
    if (this.invocationEvent && !this.isDone()) {
      this.getLogger().warn(
        `Multiple executions of a task cannot run concurrently. Warning triggered with: params=${JSON.stringify(
          taskParams
        )} and invocationEvent=${JSON.stringify(invocationEvent)}`
      );
      this.emitEndEvent(
        TaskResultStatus.Cancelled,
        new Error(
          "Concurrent Execution: Executing multiple instances of a task concurrently is not allowed"
        ),
        invocationEvent.id
      );
    }

    this.taskParams = taskParams;
    this.invocationEvent = invocationEvent;

    this.log(`Run triggered by ${invocationEvent.name} event`);
    try {
      await this.checkIfCanRun();
      await this.onRun();
      if (!this.isDone()) {
        this.done(this.taskConfig.outputEventNames[0]);
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
    return !this.taskConfig.foreground;
  }

  /**
   * Method to be called by the task runner if the task takes longer than expected to be
   * executed. Finishes the task chain and gracefully cancels the task through onCancel.
   */
  cancel(): void {
    this.emitEndEvent(TaskResultStatus.Cancelled);
    if (this._cancelFunctions.has(this.invocationEvent.id)) {
      const cancelFunction = this._cancelFunctions.get(this.invocationEvent.id);
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
    defer(this.name, seconds, params ? params : this.taskParams);
    this.log(`Will run again in ${seconds} s`);
  }

  /**
   * The content of the task to be executed
   */
  protected abstract onRun(): Promise<void>;

  /**
   * Method to be called to inject a function in charge of cleaning up
   * resources on task cancellation
   */
  protected setCancelFunction(f: CancelFunction) {
    if (this.isDone()) {
      f();

      return;
    }
    this._cancelFunctions.set(this.invocationEvent.id, f);
  }

  /**
   * Meant to be used by the task itself. Task result must be emitted through here.
   * @param eventName The event to be emitted as a done signal
   * @param data Optional data that comes along with the event
   */
  protected done(eventName: string, data: { [key: string]: any } = {}) {
    if (this.isDone()) {
      return;
    }
    this.markAsDone();
    if (!hasListeners(eventName)) {
      this.emitEndEvent(TaskResultStatus.Ok);

      return;
    }

    emit({
      name: eventName,
      id: this.invocationEvent.id,
      data,
    });

    this.log(`Finished running with ${eventName} event`);
  }

  /**
   * Meant to be used by the task itself. Logs should be printed through here.
   * @param message The message to be printed
   */
  protected log(message: any) {
    this.getLogger().info(
      `${message} (invocationId=${this.invocationEvent.id})`
    );
  }

  private emitEndEvent(
    status: TaskResultStatus,
    err?: Error,
    invocationId?: string
  ): void {
    const id = invocationId ? invocationId : this.invocationEvent.id;
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

  private isDone(): boolean {
    return this._executionHistory.has(this.invocationEvent.id);
  }

  private markAsDone(invocationId?: string) {
    const id = invocationId ? invocationId : this.invocationEvent.id;
    this._executionHistory.add(id);
  }

  private removeCancelFunction() {
    this._cancelFunctions.delete(this.invocationEvent.id);
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
