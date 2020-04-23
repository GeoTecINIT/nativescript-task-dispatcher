import { Common } from "./task-dispatcher.common";
import { BootReceiver } from "./internal/android/boot-receiver.android";
import { WatchdogReceiver } from "./internal/tasks/scheduler/android/alarms/watchdog/receiver.android";

const bootReceiver = new BootReceiver();
const watchdogReceiver = new WatchdogReceiver();

class TaskDispatcher extends Common {
  public init(): void {
    this.wireUpNativeComponents();
  }

  private wireUpNativeComponents() {
    this.wireUpBootReceiver();
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
