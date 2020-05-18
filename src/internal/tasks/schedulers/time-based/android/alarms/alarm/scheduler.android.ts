import {
  PlannedTasksStore,
  plannedTasksDB,
} from "../../../../../../persistence/planned-tasks-store";
import { AlarmManager } from "../abstract-alarm-manager.android";
import { AndroidAlarmManager } from "./manager.android";
import { WatchdogManager } from "../watchdog/manager.android";
import {
  PlannedTask,
  PlanningType,
  SchedulerType,
} from "../../../../../planner/planned-task";
import { RunnableTask } from "../../../../../runnable-task";
import { Logger, getLogger } from "../../../../../../utils/logger";

const MIN_ALARM_INTERVAL = 60000;

export class AndroidAlarmScheduler {
  private logger: Logger;

  constructor(
    private alarmManager: AlarmManager = new AndroidAlarmManager(),
    private watchdogManager: AlarmManager = new WatchdogManager(),
    private plannedTaskStore: PlannedTasksStore = plannedTasksDB
  ) {
    this.logger = getLogger("AndroidAlarmScheduler");
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
        this.alarmManager.set(this.calculateAlarmInterval(plannedTasks[0]));
      }
      if (!this.watchdogManager.alarmUp) {
        this.logger.info("Watchdog was not up! Initializing...");
        this.watchdogManager.set();
      }
    }
  }

  async schedule(runnableTask: RunnableTask): Promise<PlannedTask> {
    // TODO: move to index
    const possibleExisting = await this.plannedTaskStore.get(runnableTask);
    if (possibleExisting) {
      return possibleExisting;
    }
    const allTasks = await this.plannedTaskStore.getAllSortedByNextRun(
      PlanningType.Scheduled
    );
    const now = new Date().getTime();
    const plannedTask = new PlannedTask(
      PlanningType.Scheduled,
      SchedulerType.Alarm,
      runnableTask
    );
    if (
      allTasks.length === 0 ||
      allTasks[0].nextRun(now) > plannedTask.nextRun(now)
    ) {
      this.alarmManager.set(this.calculateAlarmInterval(plannedTask));
      if (!this.watchdogManager.alarmUp) {
        this.watchdogManager.set();
      }
    }
    await this.plannedTaskStore.insert(plannedTask);
    this.logger.info(`Task scheduled: ${JSON.stringify(plannedTask)}`);

    return plannedTask;
  }

  async cancel(id: string) {
    const possibleExisting = await this.plannedTaskStore.get(id);
    if (!possibleExisting) {
      return;
    }
    const allTasks = await this.plannedTaskStore.getAllSortedByNextRun(
      PlanningType.Scheduled
    );
    const now = new Date().getTime();
    if (allTasks.length === 1) {
      this.alarmManager.cancel();
      this.watchdogManager.cancel();
    } else if (
      allTasks[0].nextRun(now) === possibleExisting.nextRun(now) &&
      allTasks[1].nextRun(now) !== possibleExisting.nextRun(now)
    ) {
      this.alarmManager.set(this.calculateAlarmInterval(allTasks[1]));
    }
    await this.plannedTaskStore.delete(id);
    this.logger.info(`Task with id=${id} has been canceled`);
  }

  private calculateAlarmInterval(plannedTask: PlannedTask): number {
    const nextRun = plannedTask.nextRun();

    return nextRun > MIN_ALARM_INTERVAL ? nextRun : MIN_ALARM_INTERVAL;
  }
}
