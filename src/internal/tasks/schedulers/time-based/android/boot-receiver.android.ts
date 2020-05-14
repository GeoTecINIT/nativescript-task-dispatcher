import { AndroidAlarmScheduler } from "./alarms/alarm/scheduler.android";
import { getLogger } from "../../../../utils/logger";

export class BootReceiver
  implements es.uji.geotec.taskdispatcher.BootReceiverDelegate {
  onReceive(context: android.content.Context, intent: android.content.Intent) {
    const logger = getLogger("BootReceiver");
    logger.info("Performing boot initializations");

    const alarmScheduler = new AndroidAlarmScheduler();
    alarmScheduler
      .setup()
      .then(() => logger.debug("Alarm setup has run"))
      .catch((err) => {
        logger.error(`${err}`);
      });
  }
}
