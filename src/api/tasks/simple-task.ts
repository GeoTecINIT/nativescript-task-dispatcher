import { Task, TaskConfig, TaskParams, CancelFunction } from './task';
import { PlatformEvent } from '../events';

type SimpleTaskFunction = (ctx: SimpleTaskContext) => Promise<void>;

export class SimpleTask extends Task {
  constructor(
    name: string,
    private functionToRun: SimpleTaskFunction,
    taskConfig?: TaskConfig
  ) {
    super(name, taskConfig);
  }

  protected async onRun() {
    const params = this.taskParams;
    const evt = this.invocationEvent;

    const done = (eventName: string, data: { [key: string]: any }) =>
      this.done(eventName, data);
    const onCancel = (f: () => void) => this.setCancelFunction(f);
    const runAgainIn = (seconds: number, taskParams: TaskParams) =>
      this.runAgainIn(seconds, taskParams);
    const log = (message: any) => this.log(message);

    const ctx: SimpleTaskContext = {
      params,
      evt,
      done,
      onCancel,
      runAgainIn,
      log,
    };
    await this.functionToRun(ctx);
  }
}

interface SimpleTaskContext {
  params: TaskParams;
  evt: PlatformEvent;
  done(eventName: string, data: { [key: string]: any }): void;
  onCancel(cancelFunction: CancelFunction): void;
  runAgainIn(seconds: number, params?: TaskParams): void;
  log(message: any): void;
}
