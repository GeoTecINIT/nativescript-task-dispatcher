import { PowerSavingsManager } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based/android/alarms/power-savings-manager.android";
import { createOsForegroundActivityMock, isSdkBelow } from "./index";
import { Utils } from "@nativescript/core";
import { createSavingsDeactivationIntent } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based/android/intents.android";

describe("Power savings manager", () => {
    if (typeof android === "undefined") {
        return;
    }

    const powerManagerMock = createOsPowerManagerMock();
    const foregroundActivityMock = createOsForegroundActivityMock();

    beforeEach(() => {
        spyOn(
            powerManagerMock,
            "isIgnoringBatteryOptimizations"
        ).and.returnValue(false);
        spyOn(foregroundActivityMock, "startActivity");
    });

    it("savings are disabled by default when api level is lower than 23", () => {
        const powerSavingsManager = new PowerSavingsManager(
            powerManagerMock,
            22
        );

        const areDisabled = powerSavingsManager.areDisabled();

        expect(areDisabled).toBeTruthy();
        expect(
            powerManagerMock.isIgnoringBatteryOptimizations
        ).not.toHaveBeenCalled();
    });

    it("checks if power savings are enabled", () => {
        if (isSdkBelow(23)) return;

        const powerSavingsManager = new PowerSavingsManager(powerManagerMock);

        const areDisabled = powerSavingsManager.areDisabled();

        expect(areDisabled).toBeFalse();
        expect(
            powerManagerMock.isIgnoringBatteryOptimizations
        ).toHaveBeenCalled();
    });

    it("requests to disable savings when it has to", () => {
        if (isSdkBelow(23)) return;

        const powerSavingsManager = new PowerSavingsManager(
            powerManagerMock,
            android.os.Build.VERSION.SDK_INT,
            () => foregroundActivityMock
        );

        powerSavingsManager.requestDeactivation();

        expect(foregroundActivityMock.startActivity).toHaveBeenCalledOnceWith(
            createSavingsDeactivationIntent(
                Utils.android.getApplicationContext().getPackageName()
            )
        );
    });
});

function createOsPowerManagerMock(): android.os.PowerManager {
    const powerManager = {
        isIgnoringBatteryOptimizations(pkg: string): boolean {
            return true;
        },
    };

    return powerManager as android.os.PowerManager;
}
