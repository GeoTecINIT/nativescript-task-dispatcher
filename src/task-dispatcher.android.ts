import { Common, ConfigParams } from "./task-dispatcher.common";

import { Task } from "./tasks";
import { TaskGraph } from "./tasks/graph";

import { setTaskSchedulerCreator } from "./internal/tasks/schedulers/time-based/common";
import { getAndroidTaskScheduler } from "./internal/tasks/schedulers/time-based/android";
import { setTaskChainLauncherCreator } from "./internal/tasks/schedulers/event-driven/common";
import { getAndroidTaskChainLauncher } from "./internal/tasks/schedulers/event-driven/android";
import { getBootReceiver } from "./internal/tasks/schedulers/time-based/android/boot-receiver.android";
import { getAlarmReceiver } from "./internal/tasks/schedulers/time-based/android/alarms/alarm/receiver.android";
import { getAlarmRunnerService } from "./internal/tasks/schedulers/time-based/android/alarms/alarm/runner-service.android";
import { getWatchDogReceiver } from "./internal/tasks/schedulers/time-based/android/alarms/watchdog/receiver.android";
import { getTaskChainRunnerService } from "./internal/tasks/schedulers/event-driven/android/runner-service.android";

class TaskDispatcher extends Common {
  public init(
    appTasks: Array<Task>,
    appTaskGraph: TaskGraph,
    config?: ConfigParams
  ): Promise<void> {
    setTaskSchedulerCreator(() => getAndroidTaskScheduler());
    setTaskChainLauncherCreator(() => getAndroidTaskChainLauncher());
    this.wireUpNativeComponents();
    return super.init(appTasks, appTaskGraph, config);
  }

  public isReady() {
    getAndroidTaskScheduler().setup();
    return super.isReady();
  }

  private wireUpNativeComponents() {
    this.wireUpBootReceiver();
    this.wireUpAlarmReceiver();
    this.wireUpAlarmRunnerService();
    this.wireUpWatchdogReceiver();
    this.wireUpTaskChainRunnerService();
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

  private wireUpTaskChainRunnerService() {
    es.uji.geotec.taskdispatcher.runners.TaskChainRunnerService.setTaskChainRunnerServiceDelegate(
      new es.uji.geotec.taskdispatcher.runners.TaskChainRunnerServiceDelegate({
        onCreate: (nativeService) =>
          getTaskChainRunnerService().onCreate(nativeService),
        onStartCommand: (intent, flags, startId) =>
          getTaskChainRunnerService().onStartCommand(intent, flags, startId),
        onDestroy: () => getTaskChainRunnerService().onDestroy(),
      })
    );
  }
}

export const taskDispatcher = new TaskDispatcher();
