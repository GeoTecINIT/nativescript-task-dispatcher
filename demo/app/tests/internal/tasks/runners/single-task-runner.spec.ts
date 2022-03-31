import { setTasks } from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "..";
import { createPlannedTaskStoreMock } from "../../persistence";
import {
    PlannedTask,
    PlanningType,
    SchedulerType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";
import { SingleTaskRunner } from "nativescript-task-dispatcher/internal/tasks/runners/single-task-runner";
import {
    TaskDispatcherEvent,
    emit,
    createEvent,
    DispatchableEvent,
} from "nativescript-task-dispatcher/internal/events";

describe("Single task runner", () => {
    setTasks(testTasks);
    const taskStore = createPlannedTaskStoreMock();

    const dummyTask = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 60000,
            recurrent: true,
            params: {},
        }
    );
    const dummyOneShotTask = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 60000,
            recurrent: false,
            params: {},
        }
    );
    const dummyImmediateTask = new PlannedTask(
        PlanningType.Immediate,
        SchedulerType.None,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 0,
            recurrent: false,
            params: {},
        }
    );
    const failedTask = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "failedTask",
            startAt: -1,
            interval: 60000,
            recurrent: false,
            params: {},
        }
    );
    failedTask.errorCount = 1;
    const timeoutTask = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "timeoutTask",
            startAt: -1,
            interval: 60000,
            recurrent: false,
            params: {},
        }
    );
    timeoutTask.timeoutCount = 1;

    let startEvent: DispatchableEvent;
    let timeoutEvent: DispatchableEvent;

    const taskRunner = new SingleTaskRunner(taskStore);

    beforeEach(() => {
        startEvent = createEvent(TaskDispatcherEvent.TaskExecutionStarted);
        timeoutEvent = createEvent(TaskDispatcherEvent.TaskExecutionTimedOut, {
            id: startEvent.id,
        });

        spyOn(taskStore, "updateLastRun").and.returnValue(Promise.resolve());
        spyOn(taskStore, "increaseErrorCount").and.returnValue(
            Promise.resolve()
        );
        spyOn(taskStore, "increaseTimeoutCount").and.returnValue(
            Promise.resolve()
        );
        spyOn(taskStore, "delete").and.returnValue(Promise.resolve());
    });

    it("executes a task successfully", async () => {
        await taskRunner.run(dummyTask, startEvent);

        expect(taskStore.updateLastRun).toHaveBeenCalledWith(
            dummyTask.id,
            jasmine.any(Number)
        );
        expect(taskStore.delete).not.toHaveBeenCalled();
    });

    it("executes a one-shot task successfully", async () => {
        spyOn(taskStore, "get").and.returnValue(
            Promise.resolve(dummyOneShotTask)
        );

        await taskRunner.run(dummyOneShotTask, startEvent);

        expect(taskStore.updateLastRun).toHaveBeenCalledWith(
            dummyOneShotTask.id,
            jasmine.any(Number)
        );
        expect(taskStore.delete).toHaveBeenCalled();
    });

    it("executes a immediate task successfully", async () => {
        await taskRunner.run(dummyImmediateTask, startEvent);

        expect(taskStore.updateLastRun).toHaveBeenCalledWith(
            dummyImmediateTask.id,
            jasmine.any(Number)
        );
        expect(taskStore.delete).not.toHaveBeenCalled();
    });

    it("increases the error count of a task that has failed", async () => {
        spyOn(taskStore, "get").and.returnValue(Promise.resolve(failedTask));

        await taskRunner.run(failedTask, startEvent);

        expect(taskStore.increaseErrorCount).toHaveBeenCalledWith(
            failedTask.id
        );
        expect(taskStore.delete).not.toHaveBeenCalled();
    });

    it("increases the timeout count of a task that has failed", async () => {
        setTimeout(() => emit(timeoutEvent), 200);
        spyOn(taskStore, "get").and.returnValue(Promise.resolve(timeoutTask));
        await taskRunner.run(timeoutTask, startEvent);

        expect(taskStore.increaseTimeoutCount).toHaveBeenCalledWith(
            timeoutTask.id
        );
        expect(taskStore.delete).not.toHaveBeenCalled();
    });
});
