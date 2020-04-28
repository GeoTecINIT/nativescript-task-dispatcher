import { AlarmManager } from "nativescript-task-dispatcher/internal/tasks/scheduler/android/alarms/abstract-alarm-manager.android";
import { AndroidAlarmScheduler } from "nativescript-task-dispatcher/internal/tasks/scheduler/android/alarms/alarm/scheduler.android";
import {
    PlannedTask,
    PlanningType,
    SchedulerType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";
import { createPlannedTaskStoreMock } from "../../../../../persistence";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";

describe("Android Alarm Scheduler", () => {
    const manager = createAlarmManagerMock();
    const watchdog = createAlarmManagerMock();
    const taskStore = createPlannedTaskStoreMock();

    const androidAlarm = new AndroidAlarmScheduler(
        manager,
        watchdog,
        taskStore
    );

    let now: number;
    let dummyTask: RunnableTask;
    let dummyDelayedTask: RunnableTask;
    let closeDelayedTask: RunnableTask;
    let lowerFreqTask: RunnableTask;
    let higherFreqTask: RunnableTask;
    let equalFreqTask: RunnableTask;

    let expectedTask: PlannedTask;
    let expectedDelayedTask: PlannedTask;
    let closeDelayedPT: PlannedTask;
    let lowerFreqPT: PlannedTask;
    let higherFreqPT: PlannedTask;
    let equalFreqPT: PlannedTask;

    beforeEach(() => {
        now = new Date().getTime();
        dummyTask = {
            name: "dummyTask",
            startAt: -1,
            interval: 120000,
            recurrent: true,
            params: {},
        };
        dummyDelayedTask = {
            ...dummyTask,
            startAt: now + 75000,
        };
        closeDelayedTask = {
            ...dummyTask,
            startAt: now + 30000,
        };
        lowerFreqTask = {
            ...dummyTask,
            interval: dummyTask.interval * 2,
        };
        higherFreqTask = {
            ...dummyTask,
            interval: dummyTask.interval / 2,
        };
        equalFreqTask = {
            ...dummyTask,
            name: "patata",
        };

        expectedTask = createPlannedTask(dummyTask);
        expectedDelayedTask = createPlannedTask(dummyDelayedTask);
        closeDelayedPT = createPlannedTask(closeDelayedTask);
        lowerFreqPT = createPlannedTask(lowerFreqTask);
        higherFreqPT = createPlannedTask(higherFreqTask);
        equalFreqPT = createPlannedTask(equalFreqTask);
        equalFreqPT.createdAt = expectedTask.createdAt;

        spyOn(taskStore, "insert").and.returnValue(Promise.resolve());
        spyOn(taskStore, "delete").and.returnValue(Promise.resolve());
        spyOn(manager, "set");
        spyOn(manager, "cancel");
        spyOn(watchdog, "set");
        spyOn(watchdog, "cancel");
    });

    it("schedules a task and an alarm when no other task exists", async () => {
        spyOn(taskStore, "get")
            .withArgs(dummyTask)
            .and.returnValue(Promise.resolve(null));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([])
        );

        const scheduledTask = await androidAlarm.schedule(dummyTask);

        expect(taskStore.get).toHaveBeenCalled();
        expect(taskStore.getAllSortedByNextRun).toHaveBeenCalled();
        expect(manager.set).toHaveBeenCalled();
        expect(
            isLastCallCloseTo(manager.set, dummyTask.interval, 1000)
        ).toBeTruthy();
        expect(watchdog.set).toHaveBeenCalled();
        expect(taskStore.insert).toHaveBeenCalled();
        expect(scheduledTask).not.toBeNull();
    });

    it("does nothing when a task has already been scheduled", async () => {
        spyOn(taskStore, "get")
            .withArgs(dummyTask)
            .and.returnValue(Promise.resolve(expectedTask));
        const scheduledTask = await androidAlarm.schedule(dummyTask);
        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.set).not.toHaveBeenCalled();
        expect(scheduledTask).toBe(expectedTask);
    });

    it("schedules a task and reschedules an alarm when a lower frequency task exists", async () => {
        spyOn(taskStore, "get")
            .withArgs(higherFreqTask)
            .and.returnValue(Promise.resolve(null));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask])
        );

        const scheduledTask = await androidAlarm.schedule(higherFreqTask);
        expect(manager.set).toHaveBeenCalled();
        expect(
            isLastCallCloseTo(manager.set, higherFreqTask.interval, 1000)
        ).toBeTruthy();
        expect(watchdog.set).toHaveBeenCalled();
        expect(taskStore.insert).toHaveBeenCalled();
        expect(scheduledTask).not.toBeNull();
    });

    it("schedules a task and reschedules an alarm when the task starts earlier than the scheduled ones", async () => {
        spyOn(taskStore, "get")
            .withArgs(dummyDelayedTask)
            .and.returnValue(Promise.resolve(null));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask])
        );

        const scheduledTask = await androidAlarm.schedule(dummyDelayedTask);

        expect(manager.set).toHaveBeenCalled();
        expect(
            isLastCallCloseTo(
                manager.set,
                expectedDelayedTask.nextRun(now),
                1000
            )
        ).toBeTruthy();
        expect(watchdog.set).toHaveBeenCalled();
        expect(taskStore.insert).toHaveBeenCalled();
        expect(scheduledTask).not.toBeNull();
    });

    it("schedules a task and does not reschedule an alarm when a higher frequency task exists", async () => {
        spyOn(taskStore, "get")
            .withArgs(lowerFreqTask)
            .and.returnValue(Promise.resolve(null));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask])
        );

        const scheduledTask = await androidAlarm.schedule(lowerFreqTask);

        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.set).not.toHaveBeenCalled();
        expect(taskStore.insert).toHaveBeenCalled();
        expect(scheduledTask).not.toBeNull();
    });

    it("does not reschedule the alarm when it is going to be scheduled in less than 60 seconds", async () => {
        spyOn(taskStore, "get")
            .withArgs(higherFreqTask)
            .and.returnValue(Promise.resolve(null));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([closeDelayedPT])
        );

        const scheduledTask = await androidAlarm.schedule(higherFreqTask);

        expect(manager.set).not.toHaveBeenCalled();
        expect(taskStore.insert).toHaveBeenCalled();
        expect(scheduledTask).not.toBeNull();
    });

    it("schedules a delayed task in 60 seconds when it has to start in less than 60 seconds", async () => {
        spyOn(taskStore, "get")
            .withArgs(closeDelayedTask)
            .and.returnValue(Promise.resolve(null));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask])
        );

        const scheduledTask = await androidAlarm.schedule(closeDelayedTask);

        expect(manager.set).toHaveBeenCalledWith(60000);
        expect(taskStore.insert).toHaveBeenCalled();
        expect(scheduledTask).not.toBeNull();
    });

    it("removes the highest frequency scheduled task and reschedules the alarm", async () => {
        spyOn(taskStore, "get")
            .withArgs(higherFreqPT.id)
            .and.returnValue(Promise.resolve(higherFreqPT));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([higherFreqPT, expectedTask])
        );

        await androidAlarm.cancel(higherFreqPT.id);

        expect(manager.set).toHaveBeenCalled();
        expect(
            isLastCallCloseTo(manager.set, expectedTask.interval, 1000)
        ).toBeTruthy();
        expect(taskStore.delete).toHaveBeenCalledWith(higherFreqPT.id);
    });

    it("removes the highest frequency scheduled task and reschedules the alarm with delayed task nextRun", async () => {
        spyOn(taskStore, "get")
            .withArgs(higherFreqPT.id)
            .and.returnValue(Promise.resolve(higherFreqPT));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([higherFreqPT, expectedDelayedTask])
        );

        await androidAlarm.cancel(higherFreqPT.id);

        expect(manager.set).toHaveBeenCalled();
        expect(
            isLastCallCloseTo(
                manager.set,
                expectedDelayedTask.nextRun(now),
                1000
            )
        ).toBeTruthy();
        expect(taskStore.delete).toHaveBeenCalledWith(higherFreqPT.id);
    });

    it("removes a task different than the one with the highest frequency", async () => {
        spyOn(taskStore, "get")
            .withArgs(lowerFreqPT.id)
            .and.returnValue(Promise.resolve(lowerFreqPT));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask, lowerFreqPT])
        );

        await androidAlarm.cancel(lowerFreqPT.id);

        expect(manager.cancel).not.toHaveBeenCalled();
        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.cancel).not.toHaveBeenCalled();
        expect(watchdog.set).not.toHaveBeenCalled();
        expect(taskStore.delete).toHaveBeenCalledWith(lowerFreqPT.id);
    });

    it("removes a task with the same frequency than the one with the highest frequency", async () => {
        spyOn(taskStore, "get")
            .withArgs(equalFreqPT.id)
            .and.returnValue(Promise.resolve(equalFreqPT));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([equalFreqPT, expectedTask])
        );

        await androidAlarm.cancel(equalFreqPT.id);

        expect(manager.cancel).not.toHaveBeenCalled();
        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.cancel).not.toHaveBeenCalled();
        expect(watchdog.set).not.toHaveBeenCalled();
        expect(taskStore.delete).toHaveBeenCalledWith(equalFreqPT.id);
    });

    it("removes the only remaining task and cancels the alarm", async () => {
        spyOn(taskStore, "get")
            .withArgs(expectedTask.id)
            .and.returnValue(Promise.resolve(expectedTask));
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask])
        );

        await androidAlarm.cancel(expectedTask.id);

        expect(manager.cancel).toHaveBeenCalled();
        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.cancel).toHaveBeenCalled();
        expect(watchdog.set).not.toHaveBeenCalled();
        expect(taskStore.delete).toHaveBeenCalledWith(expectedTask.id);
    });

    it("will not remove a task not scheduled", async () => {
        spyOn(taskStore, "get")
            .withArgs(expectedTask.id)
            .and.returnValue(Promise.resolve(null));

        await androidAlarm.cancel(expectedTask.id);

        expect(taskStore.delete).not.toHaveBeenCalled();
        expect(manager.cancel).not.toHaveBeenCalled();
        expect(watchdog.cancel).not.toHaveBeenCalled();
        expect(taskStore.delete).not.toHaveBeenCalled();
    });

    it("sets an alarm when there are scheduled tasks and alarm is not up neither the watchdog", async () => {
        spyOnProperty(manager, "alarmUp").and.returnValue(false);
        spyOnProperty(watchdog, "alarmUp").and.returnValue(false);
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask, lowerFreqPT])
        );

        await androidAlarm.setup();

        expect(manager.set).toHaveBeenCalled();
        expect(
            isLastCallCloseTo(manager.set, expectedTask.interval, 1000)
        ).toBeTruthy();
        expect(watchdog.set).toHaveBeenCalled();
    });

    it("sets an alarm when there are scheduled tasks and alarm is not up", async () => {
        spyOnProperty(manager, "alarmUp").and.returnValue(false);
        spyOnProperty(watchdog, "alarmUp").and.returnValue(true);
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask, lowerFreqPT])
        );

        await androidAlarm.setup();

        expect(manager.set).toHaveBeenCalled();
        expect(
            isLastCallCloseTo(manager.set, expectedTask.interval, 1000)
        ).toBeTruthy();
        expect(watchdog.set).not.toHaveBeenCalled();
    });

    it("sets an alarm when there are scheduled tasks and watchdog is not up", async () => {
        spyOnProperty(manager, "alarmUp").and.returnValue(true);
        spyOnProperty(watchdog, "alarmUp").and.returnValue(false);
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([expectedTask, lowerFreqPT])
        );

        await androidAlarm.setup();

        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.set).toHaveBeenCalled();
    });

    it("does not set an alarm when there are no scheduled tasks", async () => {
        spyOnProperty(manager, "alarmUp").and.returnValue(false);
        spyOnProperty(watchdog, "alarmUp").and.returnValue(false);
        spyOn(taskStore, "getAllSortedByNextRun").and.returnValue(
            Promise.resolve([])
        );

        await androidAlarm.setup();

        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.set).not.toHaveBeenCalled();
    });

    it("does not set an alarm when alarm is already up", async () => {
        spyOnProperty(manager, "alarmUp").and.returnValue(true);
        spyOnProperty(watchdog, "alarmUp").and.returnValue(true);

        await androidAlarm.setup();

        expect(manager.set).not.toHaveBeenCalled();
        expect(watchdog.set).not.toHaveBeenCalled();
    });
});

function createAlarmManagerMock(): AlarmManager {
    return {
        get alarmUp() {
            return false;
        },
        set(interval: number) {
            return null;
        },
        cancel() {
            return null;
        },
    };
}

function createPlannedTask(task: RunnableTask) {
    return new PlannedTask(PlanningType.Scheduled, SchedulerType.Alarm, task);
}

function isLastCallCloseTo(spy: any, num: number, threshold: number): boolean {
    const lastArg = (spy as jasmine.Spy).calls.mostRecent().args[0];

    return lastArg > num - threshold && lastArg <= num;
}
