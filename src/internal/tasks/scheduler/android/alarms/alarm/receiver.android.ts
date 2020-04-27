import { TaskManager } from "../../../../manager";
import { AlarmManager } from "../abstract-alarm-manager.android";
import { AndroidAlarmManager } from "./manager.android";
import { plannedTasksDB } from "../../../../../persistence/planned-tasks-store";
import { createAlarmRunnerServiceIntent } from "../../intents.android";
import { PlanningType } from "../../../../planner/planned-task";
import { Logger, getLogger } from "../../../../../utils/logger";

const MIN_INTERVAL = 60000;

export class AlarmReceiver
  implements es.uji.geotec.taskdispatcher.alarms.AlarmReceiverDelegate {
  private taskManager: TaskManager;
  private alarmManager: AlarmManager;
  private timeOffset: number;
  private currentTime: number;

  private logger: Logger;

  onReceive(context: android.content.Context, intent: android.content.Intent) {
    this.logger = getLogger("AlarmReceiver");
    this.logger.info("Alarm triggered");

    this.timeOffset = 30000;
    this.currentTime = new Date().getTime();
    this.taskManager = new TaskManager(
      PlanningType.Alarm,
      plannedTasksDB,
      this.timeOffset,
      this.currentTime
    );
    this.alarmManager = new AndroidAlarmManager();

    this.handleAlarmTrigger(context)
      .then(() => {
        this.logger.debug("Alarm handled");
      })
      .catch((err) => {
        this.logger.error(err);
      });
  }

  private async handleAlarmTrigger(context: android.content.Context) {
    await this.rescheduleIfNeeded();
    await this.startTaskRunnerService(context);
  }

  private async rescheduleIfNeeded() {
    const willContinue = await this.taskManager.willContinue();
    if (willContinue) {
      let nextInterval = await this.taskManager.nextInterval();
      nextInterval = nextInterval > MIN_INTERVAL ? nextInterval : MIN_INTERVAL;
      this.alarmManager.set(nextInterval);
      this.logger.info(`Next alarm will be run in: ${nextInterval}`);
    } else {
      this.logger.info("Won't reschedule");
    }
  }

  private async startTaskRunnerService(context: android.content.Context) {
    const tasksToRun = await this.taskManager.tasksToRun();
    if (tasksToRun.length > 0) {
      const requiresForeground = await this.taskManager.requiresForeground();
      this.startAlarmRunnerService(context, requiresForeground);
    } else {
      this.logger.warn("Alarm triggered without tasks to run!");
    }
  }

  private startAlarmRunnerService(
    context: android.content.Context,
    inForeground: boolean
  ) {
    const startRunnerService = createAlarmRunnerServiceIntent(context, {
      runInForeground: inForeground,
      timeOffset: this.timeOffset,
      invocationTime: this.currentTime,
    });
    if (inForeground) {
      androidx.core.content.ContextCompat.startForegroundService(
        context,
        startRunnerService
      );
    } else {
      context.startService(startRunnerService);
    }
  }
}
