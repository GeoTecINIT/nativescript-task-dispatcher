import { createEvent, emit, TaskDispatcherEvent } from "../events";

export class TaskChain {
  static finalize(id: string, status: TaskResultStatus, err?: Error) {
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
}

export enum TaskResultStatus {
  Ok = "ok",
  Error = "error",
  Cancelled = "cancelled",
}

export interface TaskChainResult {
  status: TaskResultStatus;
  reason?: Error;
}
