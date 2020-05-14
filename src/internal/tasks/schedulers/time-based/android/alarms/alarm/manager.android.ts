import { android as androidApp } from "tns-core-modules/application/application";
import { createAlarmReceiverIntent } from "../../intents.android";
import { AbstractAlarmManager } from "../abstract-alarm-manager.android";
import { PowerSavingsManager } from "../power-savings-manager.android";
import { getLogger } from "../../../../../../utils/logger";
import { planningTimestamp } from "../../../planning-timestamp";

const BATTERY_SAVINGS_THRESHOLD = 15 * 60 * 1000;

export class AndroidAlarmManager extends AbstractAlarmManager {
  constructor(
    osAlarmManager = androidApp.context.getSystemService(
      android.content.Context.ALARM_SERVICE
    ) as android.app.AlarmManager,
    private powerManager = new PowerSavingsManager(),
    private sdkVersion = android.os.Build.VERSION.SDK_INT
  ) {
    super(
      osAlarmManager,
      createAlarmReceiverIntent(androidApp.context),
      getLogger("AndroidAlarmManager")
    );
  }

  set(interval: number): void {
    if (interval < BATTERY_SAVINGS_THRESHOLD) {
      this.checkPowerSavings();
    }

    if (this.alarmUp) {
      this.cancel();
    }
    const alarmType = android.app.AlarmManager.RTC_WAKEUP;
    const triggerAtMillis = new Date().getTime() + interval;
    const pendingIntent = this.getPendingIntent();

    if (this.sdkVersion >= 23) {
      this.osAlarmManager.setExactAndAllowWhileIdle(
        alarmType,
        triggerAtMillis,
        pendingIntent
      );
    } else if (this.sdkVersion >= 19) {
      this.osAlarmManager.setExact(alarmType, triggerAtMillis, pendingIntent);
    } else {
      this.osAlarmManager.set(alarmType, triggerAtMillis, pendingIntent);
    }

    planningTimestamp.updateCurrent();
    this.logger.info(`Alarm will be triggered in ${interval} ms`);
  }

  private checkPowerSavings(): void {
    if (this.powerManager.areDisabled()) {
      return;
    }
    this.powerManager.requestDeactivation();
  }
}
