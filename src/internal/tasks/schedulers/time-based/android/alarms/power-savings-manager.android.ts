import { Application, Utils } from "@nativescript/core";
import { createSavingsDeactivationIntent } from "../intents.android";
import { Logger, getLogger } from "../../../../../utils/logger";
import { fireInMs, waitForActivityResume } from "./perm-request-common";

const MS_TO_UPDATE = 1000;

export class PowerSavingsManager {
  private logger: Logger;
  private readonly appPackage: string;
  private askedOnce: boolean;

  constructor(
    private powerManager: android.os.PowerManager = Utils.android
      .getApplicationContext()
      .getSystemService(android.content.Context.POWER_SERVICE),
    private skdVersion = android.os.Build.VERSION.SDK_INT,
    private activityGetter = () => Application.android.foregroundActivity
  ) {
    this.logger = getLogger("PowerSavingsManager");
    this.appPackage = Utils.android.getApplicationContext().getPackageName();
  }

  areDisabled(): boolean {
    if (this.skdVersion < 23) {
      return true;
    }

    return this.powerManager.isIgnoringBatteryOptimizations(this.appPackage);
  }

  // TODO: Evaluate what to do with devices not running Android Stock layer
  async requestDeactivation(): Promise<void> {
    if (this.askedOnce || this.areDisabled()) {
      return;
    }

    const visibleActivity = this.activityGetter();
    if (!visibleActivity) {
      this.logger.warn("Battery savings can not be enabled in background");

      return;
    }
    this.askedOnce = true;

    const activityResume = waitForActivityResume();

    const intent = createSavingsDeactivationIntent(this.appPackage);
    visibleActivity.startActivity(intent);

    await activityResume;

    // In certain phones the savings update is not immediate
    await fireInMs(MS_TO_UPDATE);

    if (!this.areDisabled()) {
      throw new Error(
        "Disabling battery optimizations is required for the app to work as expected!"
      );
    }
  }
}

let powerSavingsManager: PowerSavingsManager;
export function getPowerSavingsManager(): PowerSavingsManager {
  if (!powerSavingsManager) {
    powerSavingsManager = new PowerSavingsManager();
  }
  return powerSavingsManager;
}
