import {
  EventReceiver,
  DispatchableEvent,
  TaskDispatcherEvent,
} from "../../events";
import { RunnableTask } from ".";

import { TimeUnit, toSeconds } from "../../utils/time-converter";
import { Logger, getLogger } from "../../utils/logger";

import { TaskParams } from "../task";
import { TaskPlanner } from "../planner";

export interface ReadyRunnableTaskBuilder extends EventReceiver {
  cancelOn(eventName: string): ReadyRunnableTaskBuilder;
  build(): RunnableTask;
  plan(dispatchableEvent?: DispatchableEvent): void;
}

interface DelayedRunnableTaskBuilder extends ReadyRunnableTaskBuilder {
  every(time: number, timeUnit?: TimeUnit): ReadyRunnableTaskBuilder;
}

export class RunnableTaskBuilder implements ReadyRunnableTaskBuilder {
  private startAt: number;
  private interval: number;
  private recurrent: boolean;
  private cancelEvent: string;

  private logger: Logger;

  constructor(
    private taskName: string,
    private params: TaskParams,
    private taskPlanner?: TaskPlanner
  ) {
    this.startAt = -1;
    this.interval = 0;
    this.recurrent = false;
    this.cancelEvent = TaskDispatcherEvent.DefaultCancelEvent;

    this.logger = getLogger("RunnableTaskBuilder");
  }

  now(): ReadyRunnableTaskBuilder {
    this.interval = 0;
    this.recurrent = false;

    return this;
  }

  every(time: number, timeUnit?: TimeUnit): ReadyRunnableTaskBuilder {
    const seconds = timeUnit ? toSeconds(time, timeUnit) : time;
    this.interval = seconds;
    this.recurrent = true;

    return this;
  }

  in(time: number, timeUnit?: TimeUnit): ReadyRunnableTaskBuilder {
    const seconds = timeUnit ? toSeconds(time, timeUnit) : time;
    this.interval = seconds;
    this.recurrent = false;

    return this;
  }

  at(date: Date): DelayedRunnableTaskBuilder {
    if (date > new Date()) {
      this.startAt = date.getTime();
    }

    return this;
  }

  cancelOn(eventName: string): ReadyRunnableTaskBuilder {
    this.cancelEvent = eventName;

    return this;
  }

  build(): RunnableTask {
    return {
      name: this.taskName,
      startAt: this.startAt,
      interval: this.interval,
      recurrent: this.recurrent,
      cancelEvent: this.cancelEvent,
      params: this.params,
    };
  }

  plan(dispatchableEvent?: DispatchableEvent) {
    const runnableTask = this.build();
    this.taskPlanner
      .plan(runnableTask, dispatchableEvent)
      .then((plannedTask) => {
        this.logger.info(`Task planned: ${JSON.stringify(plannedTask)}`);
      })
      .catch((err) => {
        this.logger.error(
          `Error while planning ${JSON.stringify(runnableTask)}: ${err}`
        );
      });
  }

  onReceive(dispatchableEvent: DispatchableEvent) {
    this.plan(dispatchableEvent);
  }
}
