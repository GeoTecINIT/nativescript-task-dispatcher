import { AndroidAlarmScheduler } from "./alarms/alarm/scheduler.android";
import { getLogger } from "../../../../utils/logger";
import { getExactAlarmPermsManager } from "./alarms/exact-alarm-perms-manager.android";

export class BootReceiver
  implements es.uji.geotec.taskdispatcher.BootReceiverDelegate {
  onReceive(context: android.content.Context, intent: android.content.Intent) {
    const logger = getLogger("BootReceiver");
    logger.info("Performing boot initializations");

    if (!getExactAlarmPermsManager().isGranted()) {
      logger.error(
        "Exact alarm permission not granted! Cancelling alarm setup"
      );
      return;
    }

    const alarmScheduler = new AndroidAlarmScheduler();
    alarmScheduler
      .setup()
      .then(() => logger.debug("Alarm setup has run"))
      .catch((err) => {
        logger.error(`${err}`);
      });
  }
}

let _bootReceiver: BootReceiver;
export function getBootReceiver(): BootReceiver {
  if (!_bootReceiver) {
    _bootReceiver = new BootReceiver();
  }
  return _bootReceiver;
}
