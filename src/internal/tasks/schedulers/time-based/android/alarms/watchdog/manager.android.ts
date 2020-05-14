import { android as androidApp } from "tns-core-modules/application/application";
import { AbstractAlarmManager } from "../abstract-alarm-manager.android";
import { createWatchdogReceiverIntent } from "../../intents.android";
import { getLogger } from "../../../../../../utils/logger";

const WATCHDOG_INTERVAL = 15 * 60 * 1000;

export class WatchdogManager extends AbstractAlarmManager {
  constructor(
    osAlarmManager = androidApp.context.getSystemService(
      android.content.Context.ALARM_SERVICE
    ) as android.app.AlarmManager
  ) {
    super(
      osAlarmManager,
      createWatchdogReceiverIntent(androidApp.context),
      getLogger("WatchdogManager")
    );
  }

  set(): void {
    if (this.alarmUp) {
      this.cancel();
    }
    const alarmType = android.app.AlarmManager.RTC_WAKEUP;
    const triggerAtMillis = new Date().getTime() + WATCHDOG_INTERVAL;
    const pendingIntent = this.getPendingIntent();

    this.osAlarmManager.setRepeating(
      alarmType,
      triggerAtMillis,
      WATCHDOG_INTERVAL,
      pendingIntent
    );

    this.logger.info(`Watchdog will run every ${WATCHDOG_INTERVAL} ms`);
  }
}
