import { WatchdogManager } from "nativescript-task-dispatcher/internal/tasks/scheduler/android/alarms/watchdog/manager.android";
import { createOsAlarmManagerMock } from "..";

describe("Android watchdog manager", () => {
    if (typeof android === "undefined") {
        return;
    }
    let systemAlarmManager: android.app.AlarmManager;
    let watchdogManager: WatchdogManager;
    const interval = 15 * 60 * 1000;

    beforeEach(() => {
        systemAlarmManager = createOsAlarmManagerMock();
        watchdogManager = new WatchdogManager(systemAlarmManager);
        spyOn(systemAlarmManager, "setRepeating");
        spyOn(systemAlarmManager, "cancel");
    });

    it("sets an alarm watchdog to trigger every 15 minutes", () => {
        watchdogManager.set();
        expect(systemAlarmManager.setRepeating).toHaveBeenCalledWith(
            android.app.AlarmManager.RTC_WAKEUP,
            jasmine.any(Number),
            interval,
            jasmine.any(android.app.PendingIntent)
        );
        expect(watchdogManager.alarmUp).toBeTruthy();
    });

    it("cancels an active alarm watchdog", () => {
        watchdogManager.set();
        watchdogManager.cancel();
        expect(systemAlarmManager.cancel).toHaveBeenCalled();
        expect(watchdogManager.alarmUp).not.toBeTruthy();
    });

    afterAll(() => {
        watchdogManager.cancel();
    });
});
