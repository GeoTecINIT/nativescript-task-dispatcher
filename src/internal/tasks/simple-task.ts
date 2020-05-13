import {
  Task,
  TaskConfig,
  TaskParams,
  CancelFunction,
  TaskOutcome,
} from "./task";
import { DispatchableEvent } from "../events";

type SimpleTaskFunction = (
  ctx: SimpleTaskContext
) => Promise<void | TaskOutcome>;

export class SimpleTask extends Task {
  constructor(
    name: string,
    private functionToRun: SimpleTaskFunction,
    taskConfig?: TaskConfig
  ) {
    super(name, taskConfig);
  }

  protected async onRun(params: TaskParams, evt: DispatchableEvent) {
    const onCancel = (f: () => void) => this.setCancelFunction(f);

    const runAgainIn = (seconds: number, taskParams: TaskParams) =>
      this.runAgainIn(seconds, taskParams);

    const log = (message: any) => this.log(message);

    const ctx: SimpleTaskContext = {
      params,
      evt,
      onCancel,
      runAgainIn,
      log,
    };
    return this.functionToRun(ctx);
  }
}

interface SimpleTaskContext {
  params: TaskParams;
  evt: DispatchableEvent;
  onCancel(cancelFunction: CancelFunction): void;
  runAgainIn(seconds: number, params?: TaskParams): void;
  log(message: any): void;
}
