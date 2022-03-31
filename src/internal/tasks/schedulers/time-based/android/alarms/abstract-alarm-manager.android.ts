import { Application } from "@nativescript/core";
import { Logger } from "../../../../../utils/logger";

export interface AlarmManager {
  alarmUp: boolean;
  set(interval?: number): void;
  cancel(): void;
}

export abstract class AbstractAlarmManager implements AlarmManager {
  constructor(
    protected osAlarmManager: android.app.AlarmManager,
    private receiverIntent: android.content.Intent,
    protected logger: Logger
  ) {}

  get alarmUp(): boolean {
    const PendingIntent = android.app.PendingIntent;
    const flags =
      android.os.Build.VERSION.SDK_INT >= 23
        ? PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        : PendingIntent.FLAG_NO_CREATE;
    return this.getPendingIntent(flags) !== null;
  }

  abstract set(interval?: number): void;

  cancel(): void {
    if (!this.alarmUp) {
      return;
    }
    const pendingIntent = this.getPendingIntent();
    this.osAlarmManager.cancel(pendingIntent);
    pendingIntent.cancel();
    this.logger.info("Alarm has been cancelled");
  }

  protected getPendingIntent(flags?: number): android.app.PendingIntent {
    const defaultFlags =
      android.os.Build.VERSION.SDK_INT >= 23
        ? android.app.PendingIntent.FLAG_IMMUTABLE
        : 0;
    return android.app.PendingIntent.getBroadcast(
      Application.android.context,
      0,
      this.receiverIntent,
      typeof flags === "undefined" ? defaultFlags : flags
    );
  }
}
