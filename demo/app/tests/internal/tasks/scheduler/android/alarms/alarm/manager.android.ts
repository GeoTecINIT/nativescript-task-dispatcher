import { AndroidAlarmManager } from "nativescript-task-dispatcher/internal/tasks/scheduler/android/alarms/alarm/manager.android";
import { createOsAlarmManagerMock } from "..";
import { PowerSavingsManager } from "nativescript-task-dispatcher/internal/tasks/scheduler/android/alarms/power-savings-manager.android";

describe("Android alarm manager", () => {
    if (typeof android === "undefined") {
        return;
    }

    const powerSavingsManager = createPowerSavingsManagerMock();
    let systemAlarmManager: android.app.AlarmManager;
    let alarmManager: AndroidAlarmManager;
    const interval = 60000;

    beforeEach(() => {
        systemAlarmManager = createOsAlarmManagerMock();
        alarmManager = new AndroidAlarmManager(
            systemAlarmManager,
            powerSavingsManager,
            23
        );
        spyOn(systemAlarmManager, "setExactAndAllowWhileIdle");
        spyOn(systemAlarmManager, "setExact");
        spyOn(systemAlarmManager, "set");
        spyOn(systemAlarmManager, "cancel");
        spyOn(powerSavingsManager, "requestDeactivation");
        spyOn(powerSavingsManager, "areDisabled").and.returnValue(false);
    });

    it("sets an alarm with the given interval", () => {
        alarmManager.set(15 * 60 * 1000);
        expect(systemAlarmManager.setExactAndAllowWhileIdle).toHaveBeenCalled();
        expect(systemAlarmManager.setExact).not.toHaveBeenCalled();
        expect(systemAlarmManager.set).not.toHaveBeenCalled();
        expect(alarmManager.alarmUp).toBeTruthy();
        expect(powerSavingsManager.areDisabled).not.toHaveBeenCalled();
        expect(powerSavingsManager.requestDeactivation).not.toHaveBeenCalled();
    });

    it("sets an alarm with a low interval and asks to disable battery savings", () => {
        alarmManager.set(interval);
        expect(systemAlarmManager.setExactAndAllowWhileIdle).toHaveBeenCalled();
        expect(systemAlarmManager.setExact).not.toHaveBeenCalled();
        expect(systemAlarmManager.set).not.toHaveBeenCalled();
        expect(alarmManager.alarmUp).toBeTruthy();
        expect(powerSavingsManager.areDisabled).toHaveBeenCalled();
        expect(powerSavingsManager.requestDeactivation).toHaveBeenCalled();
    });

    it("sets an exact alarm when SDK version is over 18 and bellow 23", () => {
        alarmManager = new AndroidAlarmManager(
            systemAlarmManager,
            powerSavingsManager,
            20
        );
        alarmManager.set(interval);
        expect(
            systemAlarmManager.setExactAndAllowWhileIdle
        ).not.toHaveBeenCalled();
        expect(systemAlarmManager.setExact).toHaveBeenCalled();
        expect(systemAlarmManager.set).not.toHaveBeenCalled();
        expect(alarmManager.alarmUp).toBeTruthy();
    });

    it("sets a regular alarm when skd version is bellow 19", () => {
        alarmManager = new AndroidAlarmManager(
            systemAlarmManager,
            powerSavingsManager,
            17
        );
        alarmManager.set(interval);
        expect(
            systemAlarmManager.setExactAndAllowWhileIdle
        ).not.toHaveBeenCalled();
        expect(systemAlarmManager.setExact).not.toHaveBeenCalled();
        expect(systemAlarmManager.set).toHaveBeenCalled();
        expect(alarmManager.alarmUp).toBeTruthy();
    });

    it("cancels a scheduled alarm", () => {
        alarmManager.set(interval);
        alarmManager.cancel();
        expect(systemAlarmManager.cancel).toHaveBeenCalled();
        expect(alarmManager.alarmUp).not.toBeTruthy();
    });

    afterAll(() => {
        alarmManager.cancel();
    });
});

function createPowerSavingsManagerMock(): PowerSavingsManager {
    const powerSavingsManager = {
        requestDeactivation() {
            return null;
        },
        areDisabled() {
            return true;
        },
    };

    return powerSavingsManager as PowerSavingsManager;
}
