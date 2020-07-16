import { Logger, getLogger } from "../../../../../../utils/logger";
import AwaitLock from "await-lock";

import { AlarmManager } from "../abstract-alarm-manager.android";
import { AndroidAlarmManager } from "./manager.android";
import { WatchdogManager } from "../watchdog/manager.android";

import {
  PlannedTasksStore,
  plannedTasksDB,
} from "../../../../../../persistence/planned-tasks-store";
import {
  PlannedTask,
  PlanningType,
  SchedulerType,
} from "../../../../../planner/planned-task";
import { RunnableTask } from "../../../../../runnable-task";

const MIN_ALARM_INTERVAL = 60000;

export class AndroidAlarmScheduler {
  private readonly tag: string;
  private logger: Logger;
  private lock: AwaitLock;

  constructor(
    private alarmManager: AlarmManager = new AndroidAlarmManager(),
    private watchdogManager: AlarmManager = new WatchdogManager(),
    private plannedTaskStore: PlannedTasksStore = plannedTasksDB
  ) {
    this.tag = "AndroidAlarmScheduler";
    this.logger = getLogger(this.tag);
    this.lock = new AwaitLock();
  }

  async setup(): Promise<void> {
    if (this.alarmManager.alarmUp && this.watchdogManager.alarmUp) {
      return;
    }
    const plannedTasks = await this.plannedTaskStore.getAllSortedByNextRun(
      PlanningType.Scheduled
    );
    if (plannedTasks.length > 0) {
      if (!this.alarmManager.alarmUp) {
        this.logger.info("Alarm was not up! Scheduling...");
        this.alarmManager.set(calculateAlarmInterval(plannedTasks[0]));
      }
      if (!this.watchdogManager.alarmUp) {
        this.logger.info("Watchdog was not up! Initializing...");
        this.watchdogManager.set();
      }
    }
  }

  async schedule(runnableTask: RunnableTask): Promise<PlannedTask> {
    await this.lock.acquireAsync();
    const plannedTask = await this.onSchedule(runnableTask);
    this.lock.release();
    return plannedTask;
  }

  async cancel(id: string): Promise<void> {
    await this.lock.acquireAsync();
    await this.onCancel(id);
    this.lock.release();
  }

  private async onSchedule(runnableTask: RunnableTask): Promise<PlannedTask> {
    // TODO: move to index (verify if this remains valid)
    const possibleExisting = await this.plannedTaskStore.get(runnableTask);
    if (possibleExisting) {
      return possibleExisting;
    }
    // Until here
    const allTasks = await this.plannedTaskStore.getAllSortedByNextRun(
      PlanningType.Scheduled
    );
    const now = java.lang.System.currentTimeMillis();
    const plannedTask = new PlannedTask(
      PlanningType.Scheduled,
      SchedulerType.Alarm,
      runnableTask
    );
    if (
      allTasks.length === 0 ||
      allTasks[0].nextRun(now) > plannedTask.nextRun(now)
    ) {
      this.alarmManager.set(calculateAlarmInterval(plannedTask));
      if (!this.watchdogManager.alarmUp) {
        this.watchdogManager.set();
      }
    }
    await this.plannedTaskStore.insert(plannedTask);
    this.logger.info(`Task scheduled: ${JSON.stringify(plannedTask)}`);

    return plannedTask;
  }

  private async onCancel(id: string): Promise<void> {
    const possibleExisting = await this.plannedTaskStore.get(id);
    if (!possibleExisting) {
      return;
    }
    const allTasks = await this.plannedTaskStore.getAllSortedByNextRun(
      PlanningType.Scheduled
    );
    const now = java.lang.System.currentTimeMillis();
    if (allTasks.length === 1) {
      this.alarmManager.cancel();
      this.watchdogManager.cancel();
    } else if (
      allTasks[0].nextRun(now) === possibleExisting.nextRun(now) &&
      allTasks[1].nextRun(now) !== possibleExisting.nextRun(now)
    ) {
      this.alarmManager.set(calculateAlarmInterval(allTasks[1]));
    }
    await this.plannedTaskStore.delete(id);
    this.logger.info(`Task with id=${id} has been canceled`);
  }
}

function calculateAlarmInterval(plannedTask: PlannedTask): number {
  const nextRun = plannedTask.nextRun();

  return nextRun > MIN_ALARM_INTERVAL ? nextRun : MIN_ALARM_INTERVAL;
}
