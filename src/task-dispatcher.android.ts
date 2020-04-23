import { Common } from "./task-dispatcher.common";
import { Task } from "./internal/tasks/task";
import { TaskGraph } from "./internal/tasks/graph";
import { BootReceiver } from "./internal/android/boot-receiver.android";
import { AlarmReceiver } from "./internal/tasks/scheduler/android/alarms/alarm/receiver.android";
import { AlarmRunnerService } from "./internal/tasks/scheduler/android/alarms/alarm/runner-service.android";
import { WatchdogReceiver } from "./internal/tasks/scheduler/android/alarms/watchdog/receiver.android";
import { setTaskScheduler } from "./internal/tasks/scheduler/common";
import { AndroidTaskScheduler } from "./internal/tasks/scheduler/android";

const bootReceiver = new BootReceiver();
const alarmReceiver = new AlarmReceiver();
const alarmRunnerService = new AlarmRunnerService();
const watchdogReceiver = new WatchdogReceiver();

class TaskDispatcher extends Common {
  public init(appTasks: Array<Task>, appTaskGraph: TaskGraph): Promise<void> {
    this.wireUpNativeComponents();
    setTaskScheduler(new AndroidTaskScheduler());
    return super.init(appTasks, appTaskGraph);
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
        onReceive(context, intent) {
          bootReceiver.onReceive(context, intent);
        },
      })
    );
  }

  private wireUpAlarmReceiver() {
    es.uji.geotec.taskdispatcher.alarms.AlarmReceiver.setAlarmReceiverDelegate({
      onReceive(context, intent) {
        alarmReceiver.onReceive(context, intent);
      },
    });
  }

  private wireUpAlarmRunnerService() {
    es.uji.geotec.taskdispatcher.alarms.AlarmRunnerService.setAlarmRunnerServiceDelegate(
      {
        onCreate(nativeService) {
          alarmRunnerService.onCreate(nativeService);
        },
        onStartCommand(intent, flags, startId) {
          return alarmRunnerService.onStartCommand(intent, flags, startId);
        },
        onDestroy() {
          alarmRunnerService.onDestroy();
        },
      }
    );
  }

  private wireUpWatchdogReceiver() {
    es.uji.geotec.taskdispatcher.alarms.WatchdogReceiver.setWatchdogReceiverDelegate(
      new es.uji.geotec.taskdispatcher.alarms.WatchdogReceiverDelegate({
        onReceive(context, intent) {
          watchdogReceiver.onReceive(context, intent);
        },
      })
    );
  }
}

export const taskDispatcher = new TaskDispatcher();
