import { PowerSavingsManager } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based/android/alarms/power-savings-manager.android";

describe("Power savings manager", () => {
    if (typeof android === "undefined") {
        return;
    }

    const osPowerManager = createOsPowerManagerMock();

    beforeEach(() => {
        spyOn(
            osPowerManager,
            "isIgnoringBatteryOptimizations"
        ).and.callThrough();
    });

    it("checks if power savings are enabled", () => {
        const powerSavingsManager = new PowerSavingsManager(osPowerManager);

        const areDisabled = powerSavingsManager.areDisabled();

        expect(areDisabled === true || areDisabled === false).toBeTruthy();
        expect(
            osPowerManager.isIgnoringBatteryOptimizations
        ).toHaveBeenCalled();
    });

    it("returns true by default when api level is lower than 23", () => {
        const powerSavingsManager = new PowerSavingsManager(osPowerManager, 22);

        const areDisabled = powerSavingsManager.areDisabled();

        expect(areDisabled).toBeTruthy();
        expect(
            osPowerManager.isIgnoringBatteryOptimizations
        ).not.toHaveBeenCalled();
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
