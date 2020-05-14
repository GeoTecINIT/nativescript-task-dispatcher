import { android as androidApp } from "tns-core-modules/application/application";
import { Logger } from "../../../../../utils/logger";

export interface AlarmManager {
  alarmUp: boolean;
  set(interval?: number): void;
  cancel(): void;
}

export abstract class AbstractAlarmManager implements AlarmManager {
  private pendingIntent: android.app.PendingIntent;

  constructor(
    protected osAlarmManager: android.app.AlarmManager,
    private receiverIntent: android.content.Intent,
    protected logger: Logger
  ) {}

  get alarmUp(): boolean {
    return (
      android.app.PendingIntent.getBroadcast(
        androidApp.context,
        0,
        this.receiverIntent,
        android.app.PendingIntent.FLAG_NO_CREATE
      ) !== null
    );
  }

  abstract set(interval?: number): void;

  cancel(): void {
    if (!this.alarmUp) {
      return;
    }
    const pendingIntent = this.getPendingIntent();
    this.osAlarmManager.cancel(pendingIntent);
    pendingIntent.cancel();
    this.pendingIntent = null;
    this.logger.info("Alarm has been cancelled");
  }

  protected getPendingIntent(): android.app.PendingIntent {
    if (!this.pendingIntent) {
      this.pendingIntent = android.app.PendingIntent.getBroadcast(
        androidApp.context,
        0,
        this.receiverIntent,
        0
      );
    }

    return this.pendingIntent;
  }
}
