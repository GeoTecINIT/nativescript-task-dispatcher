import { unpackAlarmRunnerServiceIntent } from "../../intents.android";
import {
  AndroidNotification,
  createNotification,
} from "../../notification-manager.android";
import {
  plannedTasksDB,
  PlannedTasksStore,
} from "../../../../../../persistence/planned-tasks-store";
import { BatchTaskRunner } from "../../../../../runners/batch-task-runner";
import {
  DispatchableEvent,
  TaskDispatcherEvent,
  emit,
  createEvent,
} from "../../../../../../events";
import { TaskManager } from "../../../../../manager";
import { PlanningType } from "../../../../../planner/planned-task";
import { Logger, getLogger } from "../../../../../../utils/logger";

const MIN_TIMEOUT = 60000;
const TIMEOUT_EVENT_OFFSET = 5000;

export class AlarmRunnerService
  implements es.uji.geotec.taskdispatcher.alarms.AlarmRunnerServiceDelegate {
  private nativeService: android.app.Service;

  private runsInForeground: boolean;
  private timeOffset: number;
  private currentTime: number;

  private started: boolean;
  private inForeground: boolean;

  private wakeLock: android.os.PowerManager.WakeLock;
  private timeoutId: number;
  private taskStore: PlannedTasksStore;

  private logger: Logger;

  onCreate(nativeService: android.app.Service) {
    this.nativeService = nativeService;

    this.runsInForeground = false;
    this.timeOffset = 0;
    this.currentTime = new Date().getTime();

    this.started = false;
    this.inForeground = false;

    this.wakeLock = alarmRunnerWakeLock(nativeService);
    this.taskStore = plannedTasksDB;

    this.logger = getLogger("AlarmRunnerService");
    this.logger.debug("onCreate called");
  }

  onStartCommand(
    intent: android.content.Intent,
    flags: number,
    startId: number
  ): number {
    this.logger.info(`Service called {flags=${flags}, startId=${startId}}`);
    const startFlag = android.app.Service.START_REDELIVER_INTENT;

    if (this.alreadyRunning(startId)) {
      return startFlag;
    }

    this.extractInvocationArguments(intent);
    if (this.runsInForeground) {
      this.runInForeground();
    }

    this.runTasks()
      .then(() => {
        this.logger.debug("Tasks finished running");
        this.gracefullyStop();
      })
      .catch((err) => {
        this.logger.error(`Error while running tasks ${err}`);
        this.gracefullyStop();
      });

    return startFlag;
  }

  onDestroy() {
    this.logger.debug("onDestroy called");
    this.gracefullyStop();
    this.nativeService = null;
  }

  private alreadyRunning(startId: number) {
    if (startId === 1) {
      this.started = true;
      this.logger.debug("Service started");

      return false;
    }
    this.logger.warn(
      `Service already running! Dismissing call -> startId: ${startId}!`
    );
    this.nativeService.stopSelf(startId);

    return true;
  }

  private extractInvocationArguments(intent: android.content.Intent) {
    const args = unpackAlarmRunnerServiceIntent(intent);
    this.logger.info(
      `InvocationParams {runsInForeground=${args.runInForeground}, offset=${args.timeOffset}, invocationTime=${args.invocationTime}}`
    );
    this.runsInForeground = args.runInForeground;
    this.timeOffset = args.timeOffset;
    this.currentTime = args.invocationTime;
  }

  private runInForeground() {
    if (this.inForeground) {
      return;
    }
    this.nativeService.startForeground(
      AndroidNotification.LocationUsage,
      createNotification(this.nativeService, AndroidNotification.LocationUsage)
    );
    this.inForeground = true;
    this.logger.debug("Running in foreground");
  }

  private async runTasks() {
    const taskManager = this.createTaskManager();

    const tasksToRun = await taskManager.tasksToRun();
    const taskCount = tasksToRun.length;
    if (taskCount > 0) {
      const timeout = await this.calculateTimeout(taskManager);
      const executionStartedEvt = this.initializeExecutionWindow(timeout);

      const taskRunner = new BatchTaskRunner(this.taskStore);
      this.logger.info(`Running ${taskCount} tasks`);
      await taskRunner.run(tasksToRun, executionStartedEvt);
    } else {
      this.logger.warn("Service was called but no tasks were run!");
    }
  }

  private createTaskManager() {
    return new TaskManager(
      PlanningType.Scheduled,
      this.taskStore,
      this.timeOffset,
      this.currentTime
    );
  }

  private initializeExecutionWindow(timeout: number): DispatchableEvent {
    this.wakeLock.acquire(timeout);
    const startEvent = createEvent(TaskDispatcherEvent.TaskExecutionStarted);
    const { id } = startEvent;
    const timeoutEvent = createEvent(
      TaskDispatcherEvent.TaskExecutionTimedOut,
      {
        id,
      }
    );
    const executionTimeout = timeout - TIMEOUT_EVENT_OFFSET;
    this.logger.info(
      `Execution will timeout in ${executionTimeout}, for tasks running with execution id: ${id}`
    );
    this.timeoutId = setTimeout(() => {
      emit(timeoutEvent);
      this.logger.warn(
        `Execution timed out for tasks running with execution id: ${id}`
      );
    }, timeout - TIMEOUT_EVENT_OFFSET);

    return startEvent;
  }

  private async calculateTimeout(taskPlanner: TaskManager) {
    const nextExecutionTime = await taskPlanner.nextInterval();

    return Math.max(nextExecutionTime, MIN_TIMEOUT);
  }

  private gracefullyStop() {
    this.moveToBackground();
    if (this.started) {
      this.logger.debug("Stopping service");
      this.killWithFire();
      this.started = false;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.wakeLock.isHeld()) {
      this.wakeLock.release();
      this.logger.debug("Lock released");
    }
  }

  private moveToBackground() {
    if (!this.inForeground) {
      return;
    }
    const andRemoveNotification = true;
    this.nativeService.stopForeground(andRemoveNotification);
    this.inForeground = false;
    this.logger.debug("Running in background");
  }

  /**
   * WHY? Sometimes onStartCommand is not called with new startIds
   * (different from 1) when the service gets destroyed and restarted
   * this ensures the service is killed when the work is done
   */
  private killWithFire() {
    let startId = 1;
    let last = false;
    while (!last) {
      last = this.nativeService.stopSelfResult(startId);
      if (!last) {
        startId++;
      }
    }
    this.logger.info(`Done running (startId=${startId})`);
  }
}

function alarmRunnerWakeLock(
  context: android.content.Context
): android.os.PowerManager.WakeLock {
  const wakeLockName = "TaskDispatcher::AlarmRunnerWakeLock";
  const powerManager = context.getSystemService(
    android.content.Context.POWER_SERVICE
  ) as android.os.PowerManager;

  return powerManager.newWakeLock(
    android.os.PowerManager.PARTIAL_WAKE_LOCK,
    wakeLockName
  );
}
