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
import { PlannedTask } from "../planner/planned-task";

export interface ReadyRunnableTaskBuilder extends EventReceiver {
  build(): RunnableTask;
  plan(dispatchableEvent?: DispatchableEvent): Promise<PlannedTask>;
}

interface ScheduledRunnableTaskBuilder extends ReadyRunnableTaskBuilder {
  cancelOn(eventName: string): ReadyRunnableTaskBuilder;
}

interface DelayedRunnableTaskBuilder extends ScheduledRunnableTaskBuilder {
  every(time: number, timeUnit?: TimeUnit): ScheduledRunnableTaskBuilder;
}

export interface RunnableTaskBuilder extends ReadyRunnableTaskBuilder {
  now(): ReadyRunnableTaskBuilder;
  every(time: number, timeUnit?: TimeUnit): ScheduledRunnableTaskBuilder;
  in(time: number, timeUnit?: TimeUnit): ScheduledRunnableTaskBuilder;
  at(date: Date): DelayedRunnableTaskBuilder;
}

export class RunnableTaskBuilderImpl implements RunnableTaskBuilder {
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
    this.startAt = -1;
    this.interval = 0;
    this.recurrent = false;

    return this;
  }

  every(time: number, timeUnit?: TimeUnit): ScheduledRunnableTaskBuilder {
    const seconds = timeUnit ? toSeconds(time, timeUnit) : time;
    this.interval = seconds;
    this.recurrent = true;

    return this;
  }

  // TODO: Perhaps now it makes more sense for in to use startAt instead of interval.
  // Will allow combining in with every, thus allowing running deferred recurrent tasks.
  in(time: number, timeUnit?: TimeUnit): ScheduledRunnableTaskBuilder {
    const seconds = timeUnit ? toSeconds(time, timeUnit) : time;
    this.interval = seconds;
    this.recurrent = false;

    return this;
  }

  at(date: Date): DelayedRunnableTaskBuilder {
    if (date > new Date()) {
      this.startAt = date.getTime();
    }
    this.recurrent = false;

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

  async plan(dispatchableEvent?: DispatchableEvent): Promise<PlannedTask> {
    const runnableTask = this.build();
    try {
      return this.taskPlanner.plan(runnableTask, dispatchableEvent);
    } catch (err) {
      throw new Error(
        `Could not plan (${JSON.stringify(runnableTask)}). Reason: ${err}`
      );
    }
  }

  onReceive(dispatchableEvent: DispatchableEvent) {
    this.plan(dispatchableEvent)
      .then((plannedTask) => {
        this.logger.info(`Task planned: ${JSON.stringify(plannedTask)}`);
      })
      .catch((err) => {
        this.logger.error(err);
      });
  }
}
