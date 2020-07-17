import {
  plannedTasksDB,
  PlannedTasksStore,
} from "../persistence/planned-tasks-store";
import {
  TaskScheduler,
  taskScheduler as getTaskScheduler,
} from "./schedulers/time-based";
import { off, on } from "../events";
import { PlannedTask, PlanningType } from "./planner/planned-task";
import { getLogger, Logger } from "../utils/logger";
import { TaskChain, TaskResultStatus } from "./task-chain";

export class TaskCancelManager {
  private cancelEvents: Set<string>;

  private logger: Logger;

  constructor(
    private taskStore: PlannedTasksStore = plannedTasksDB,
    private taskScheduler?: TaskScheduler
  ) {
    this.cancelEvents = new Set();
    this.logger = getLogger("TaskCancelManager");
  }

  async init(): Promise<void> {
    const cancelEvents = await this.taskStore.getAllCancelEvents();
    cancelEvents.forEach((cancelEvent) => {
      this.listenToCancelEvent(cancelEvent);
    });
  }

  add(plannedTask: PlannedTask) {
    this.listenToCancelEvent(plannedTask.cancelEvent);
  }

  private listenToCancelEvent(cancelEvent: string) {
    if (this.cancelEvents.has(cancelEvent)) {
      return;
    }
    this.cancelEvents.add(cancelEvent);

    const listenerId = on(cancelEvent, (evt) => {
      const evtName = evt.name;
      off(evtName, listenerId);
      this.cancelEvents.delete(evtName);
      this.cancelByEventName(evtName)
        .then(() => {
          TaskChain.finalize(evt.id, TaskResultStatus.Ok);
        })
        .catch((err) => {
          TaskChain.finalize(evt.id, TaskResultStatus.Error, err);
        });
    });
  }

  private async cancelByEventName(eventName: string): Promise<void> {
    const tasks = await this.taskStore.getAllFilteredByCancelEvent(eventName);

    for (const task of tasks) {
      await this.cancelTask(task);
    }
  }

  private async cancelTask(task: PlannedTask): Promise<void> {
    try {
      if (task.planningType === PlanningType.Scheduled) {
        await this.getTaskScheduler().cancel(task.id);
      } else {
        await this.taskStore.delete(task.id);
      }
    } catch (err) {
      const { id, name, startAt, interval, recurrent } = task;
      this.logger.error(
        `Error canceling task: ${JSON.stringify({
          id,
          name,
          startAt,
          interval,
          recurrent,
        })} -> ${err}`
      );
    }
  }

  private getTaskScheduler(): TaskScheduler {
    if (!this.taskScheduler) {
      this.taskScheduler = getTaskScheduler();
    }

    return this.taskScheduler;
  }
}

export const taskCancelManager = new TaskCancelManager();
