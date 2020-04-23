import { Common } from "./task-dispatcher.common";
import { BootReceiver } from "./internal/android/boot-receiver.android";
import { AlarmReceiver } from "./internal/tasks/scheduler/android/alarms/alarm/receiver.android";
import { WatchdogReceiver } from "./internal/tasks/scheduler/android/alarms/watchdog/receiver.android";

const bootReceiver = new BootReceiver();
const alarmReceiver = new AlarmReceiver();
const watchdogReceiver = new WatchdogReceiver();

class TaskDispatcher extends Common {
  public init(): void {
    this.wireUpNativeComponents();
  }

  private wireUpNativeComponents() {
    this.wireUpBootReceiver();
    this.wireUpAlarmReceiver();
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
