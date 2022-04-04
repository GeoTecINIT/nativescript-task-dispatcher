import { ExactAlarmPermsManager } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based/android/alarms/exact-alarm-perms-manager.android";
import {
    createOsAlarmManagerMock,
    createOsForegroundActivityMock,
    isSdkBelow,
} from "~/tests/internal/tasks/schedulers/time-based/android/index";
import { createScheduleExactAlarmPermRequestIntent } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based/android/intents.android";
import { Utils } from "@nativescript/core";

describe("Exact alarm perms manager", () => {
    if (typeof android === "undefined") {
        return;
    }
    const alarmManagerMock = createOsAlarmManagerMock();
    const foregroundActivityMock = createOsForegroundActivityMock();
    beforeEach(() => {
        spyOn(alarmManagerMock, "canScheduleExactAlarms").and.returnValue(
            false
        );
        spyOn(foregroundActivityMock, "startActivity");
    });

    it("scheduling exact alarms is allowed by default when api level is lower than 31", () => {
        const exactAlarmPermsManager = new ExactAlarmPermsManager(
            alarmManagerMock,
            30
        );

        const isGranted = exactAlarmPermsManager.isGranted();

        expect(isGranted).toBeTruthy();
        expect(alarmManagerMock.canScheduleExactAlarms).not.toHaveBeenCalled();
    });

    it("checks if schedule exact alarm permission is granted", () => {
        if (isSdkBelow(31)) return;

        const exactAlarmPermsManager = new ExactAlarmPermsManager(
            alarmManagerMock
        );

        const isGranted = exactAlarmPermsManager.isGranted();

        expect(isGranted).toBeFalse();
        expect(alarmManagerMock.canScheduleExactAlarms).toHaveBeenCalled();
    });

    it("requests the permission when it has to", () => {
        if (isSdkBelow(31)) return;

        const exactAlarmPermsManager = new ExactAlarmPermsManager(
            alarmManagerMock,
            android.os.Build.VERSION.SDK_INT,
            () => foregroundActivityMock
        );

        exactAlarmPermsManager.request();

        expect(foregroundActivityMock.startActivity).toHaveBeenCalledOnceWith(
            createScheduleExactAlarmPermRequestIntent(
                Utils.android.getApplicationContext().getPackageName()
            )
        );
    });
});
