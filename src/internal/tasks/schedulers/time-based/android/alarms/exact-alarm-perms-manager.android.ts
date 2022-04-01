import { getLogger, Logger } from "../../../../../utils/logger";
import { Application, Utils } from "@nativescript/core";
import { createScheduleExactAlarmPermRequestIntent } from "../intents.android";
import { waitForActivityResume } from "./perm-request-common";

export class ExactAlarmPermsManager {
  private logger: Logger;
  private readonly appPackage: string;
  private askedOnce: boolean;

  constructor(
    private alarmManager: android.app.AlarmManager = Utils.android
      .getApplicationContext()
      .getSystemService(android.content.Context.ALARM_SERVICE),
    private skdVersion = android.os.Build.VERSION.SDK_INT,
    private activityGetter = () => Application.android.foregroundActivity
  ) {
    this.logger = getLogger("ExactAlarmPermsManager");
    this.appPackage = Utils.android.getApplicationContext().getPackageName();
  }

  isGranted(): boolean {
    if (this.skdVersion < 31) {
      return true;
    }

    return this.alarmManager.canScheduleExactAlarms();
  }

  async request(): Promise<void> {
    if (this.askedOnce || this.isGranted()) {
      return;
    }

    const visibleActivity = this.activityGetter();
    if (!visibleActivity) {
      this.logger.warn("Schedule exact alarms can not be asked in background");

      return;
    }
    this.askedOnce = true;

    const activityResume = waitForActivityResume();

    const intent = createScheduleExactAlarmPermRequestIntent(this.appPackage);
    visibleActivity.startActivity(intent);

    await activityResume;

    if (!this.isGranted()) {
      throw new Error(
        "Schedule exact alarms permission is required for the app to work as expected!"
      );
    }
  }
}

let exactAlarmPermsManager: ExactAlarmPermsManager;
export function getExactAlarmPermsManager(): ExactAlarmPermsManager {
  if (!exactAlarmPermsManager) {
    exactAlarmPermsManager = new ExactAlarmPermsManager();
  }
  return exactAlarmPermsManager;
}
