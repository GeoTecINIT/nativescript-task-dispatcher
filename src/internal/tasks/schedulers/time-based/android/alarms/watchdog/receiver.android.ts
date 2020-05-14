import { AndroidAlarmScheduler } from "../alarm/scheduler.android";
import { getLogger } from "../../../../../../utils/logger";

export class WatchdogReceiver
  implements es.uji.geotec.taskdispatcher.alarms.WatchdogReceiverDelegate {
  onReceive(context: android.content.Context, intent: android.content.Intent) {
    const logger = getLogger("WatchdogReceiver");
    logger.info("Checking alarm status");

    const alarmScheduler = new AndroidAlarmScheduler();
    alarmScheduler
      .setup()
      .then(() => logger.debug("Alarm setup has run"))
      .catch((err) => {
        logger.error(err);
      });
  }
}
