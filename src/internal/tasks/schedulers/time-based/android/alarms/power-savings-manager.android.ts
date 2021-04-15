import { Application } from "@nativescript/core";
import { createSavingsDeactivationIntent } from "../intents.android";
import { Logger, getLogger } from "../../../../../utils/logger";

export class PowerSavingsManager {
  private logger: Logger;
  private appPackage: string;
  private askedOnce: boolean;

  constructor(
    private powerManager: android.os.PowerManager = Application.android.context.getSystemService(
      android.content.Context.POWER_SERVICE
    ),
    private skdVersion = android.os.Build.VERSION.SDK_INT
  ) {
    this.logger = getLogger("PowerSavingsManager");
    this.appPackage = Application.android.context.getPackageName();
  }

  // TODO: Evaluate what to do with devices not running Android Stock layer
  requestDeactivation(): void {
    if (this.askedOnce || this.areDisabled()) {
      return;
    }

    if (!Application.android.foregroundActivity) {
      this.logger.warn("Battery savings can not be enabled in background");

      return;
    }

    this.askedOnce = true;
    const intent = createSavingsDeactivationIntent(this.appPackage);
    Application.android.foregroundActivity.startActivity(intent);
  }

  areDisabled(): boolean {
    if (this.skdVersion < 23) {
      return true;
    }

    return this.powerManager.isIgnoringBatteryOptimizations(this.appPackage);
  }
}

let powerSavingsManager: PowerSavingsManager;
export function getPowerSavingsManager(): PowerSavingsManager {
  if (!powerSavingsManager) {
    powerSavingsManager = new PowerSavingsManager();
  }
  return powerSavingsManager;
}
