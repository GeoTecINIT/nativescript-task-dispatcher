import { android as androidApp } from "tns-core-modules/application/application";

import { Common, ConfigParams } from "./task-dispatcher.common";

import { Task } from "./tasks";
import { TaskGraph } from "./tasks/graph";

import { BootReceiver } from "./internal/tasks/schedulers/time-based/android/boot-receiver.android";
import { AlarmReceiver } from "./internal/tasks/schedulers/time-based/android/alarms/alarm/receiver.android";
import { AlarmRunnerService } from "./internal/tasks/schedulers/time-based/android/alarms/alarm/runner-service.android";
import { WatchdogReceiver } from "./internal/tasks/schedulers/time-based/android/alarms/watchdog/receiver.android";
import { setTaskSchedulerCreator } from "./internal/tasks/schedulers/time-based/common";
import { AndroidTaskScheduler } from "./internal/tasks/schedulers/time-based/android";
import { setupNotificationChannels } from "./internal/tasks/schedulers/time-based/android/notification-manager.android";
import { AndroidAlarmScheduler } from "./internal/tasks/schedulers/time-based/android/alarms/alarm/scheduler.android";

class TaskDispatcher extends Common {
  public init(
    appTasks: Array<Task>,
    appTaskGraph: TaskGraph,
    config?: ConfigParams
  ): Promise<void> {
    this.wireUpNativeComponents();
    setTaskSchedulerCreator(() => getAndroidTaskScheduler());
    return super.init(appTasks, appTaskGraph, config);
  }

  public isReady() {
    new AndroidAlarmScheduler().setup();
    return super.isReady();
  }

  private wireUpNativeComponents() {
    this.wireUpBootReceiver();
    this.wireUpAlarmReceiver();
    this.wireUpAlarmRunnerService();
    this.wireUpWatchdogReceiver();
  }

  private wireUpBootReceiver() {
    es.uji.geotec.taskdispatcher.BootReceiver.setBootReceiverDelegate(
      new es.uji.geotec.taskdispatcher.BootReceiverDelegate({
        onReceive: (context, intent) =>
          getBootReceiver().onReceive(context, intent),
      })
    );
  }

  private wireUpAlarmReceiver() {
    es.uji.geotec.taskdispatcher.alarms.AlarmReceiver.setAlarmReceiverDelegate(
      new es.uji.geotec.taskdispatcher.alarms.AlarmReceiverDelegate({
        onReceive: (context, intent) =>
          getAlarmReceiver().onReceive(context, intent),
      })
    );
  }

  private wireUpAlarmRunnerService() {
    es.uji.geotec.taskdispatcher.alarms.AlarmRunnerService.setAlarmRunnerServiceDelegate(
      new es.uji.geotec.taskdispatcher.alarms.AlarmRunnerServiceDelegate({
        onCreate: (nativeService) =>
          getAlarmRunnerService().onCreate(nativeService),
        onStartCommand: (intent, flags, startId) =>
          getAlarmRunnerService().onStartCommand(intent, flags, startId),
        onDestroy: () => getAlarmRunnerService().onDestroy(),
      })
    );
  }

  private wireUpWatchdogReceiver() {
    es.uji.geotec.taskdispatcher.alarms.WatchdogReceiver.setWatchdogReceiverDelegate(
      new es.uji.geotec.taskdispatcher.alarms.WatchdogReceiverDelegate({
        onReceive: (context, intent) =>
          getWatchDogReceiver().onReceive(context, intent),
      })
    );
  }
}

let _bootReceiver: BootReceiver;
function getBootReceiver(): BootReceiver {
  if (!_bootReceiver) {
    _bootReceiver = new BootReceiver();
  }
  return _bootReceiver;
}

let _alarmReceiver: AlarmReceiver;
function getAlarmReceiver(): AlarmReceiver {
  if (!_alarmReceiver) {
    _alarmReceiver = new AlarmReceiver();
  }
  return _alarmReceiver;
}

let _alarmRunnerService: AlarmRunnerService;
function getAlarmRunnerService(): AlarmRunnerService {
  if (!_alarmRunnerService) {
    setupNotificationChannels(androidApp.context);
    _alarmRunnerService = new AlarmRunnerService();
  }
  return _alarmRunnerService;
}

let _watchdogReceiver: WatchdogReceiver;
function getWatchDogReceiver(): WatchdogReceiver {
  if (!_watchdogReceiver) {
    _watchdogReceiver = new WatchdogReceiver();
  }
  return _watchdogReceiver;
}

let _androidTaskScheduler: AndroidTaskScheduler;
function getAndroidTaskScheduler(): AndroidTaskScheduler {
  if (!_androidTaskScheduler) {
    _androidTaskScheduler = new AndroidTaskScheduler();
  }
  return _androidTaskScheduler;
}

export const taskDispatcher = new TaskDispatcher();
