import { setTasks } from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "..";
import { createPlannedTaskStoreMock } from "../../persistence";
import {
    PlannedTask,
    PlanningType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";
import { BatchTaskRunner } from "nativescript-task-dispatcher/internal/tasks/runners/batch-task-runner";
import {
    TaskDispatcherEvent,
    emit,
    createEvent,
    DispatchableEvent,
} from "nativescript-task-dispatcher/internal/events";

describe("Batch task runner", () => {
    setTasks(testTasks);
    const taskStore = createPlannedTaskStoreMock();

    const expectedDummyTask = new PlannedTask(PlanningType.Scheduled, {
        name: "dummyTask",
        startAt: -1,
        interval: 60000,
        recurrent: true,
        params: {},
    });
    const expectedFailedTask = new PlannedTask(PlanningType.Scheduled, {
        name: "failedTask",
        startAt: -1,
        interval: 60000,
        recurrent: true,
        params: {},
    });
    const expectedTimeoutTask = new PlannedTask(PlanningType.Scheduled, {
        name: "timeoutTask",
        startAt: -1,
        interval: 60000,
        recurrent: true,
        params: {},
    });
    const plannedTasks = [
        expectedDummyTask,
        expectedFailedTask,
        expectedTimeoutTask,
    ];

    let startEvent: DispatchableEvent;
    let timeoutEvent: DispatchableEvent;

    const taskRunner = new BatchTaskRunner(taskStore);

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
    });

    it("executes all the tasks successfully", async () => {
        await taskRunner.run(plannedTasks, startEvent);

        expect(taskStore.updateLastRun).toHaveBeenCalledWith(
            expectedDummyTask.id,
            jasmine.any(Number)
        );
        expect(taskStore.updateLastRun).toHaveBeenCalledWith(
            expectedFailedTask.id,
            jasmine.any(Number)
        );
        expect(taskStore.updateLastRun).toHaveBeenCalledWith(
            expectedTimeoutTask.id,
            jasmine.any(Number)
        );
    });

    it("increases the error count of a task that has failed", async () => {
        await taskRunner.run(plannedTasks, startEvent);

        expect(taskStore.increaseErrorCount).not.toHaveBeenCalledWith(
            expectedDummyTask.id
        );
        expect(taskStore.increaseErrorCount).toHaveBeenCalledWith(
            expectedFailedTask.id
        );
        expect(taskStore.increaseErrorCount).not.toHaveBeenCalledWith(
            expectedTimeoutTask.id
        );
    });

    it("increases the timeout count of a task that has failed", async () => {
        setTimeout(() => emit(timeoutEvent), 200);
        await taskRunner.run(plannedTasks, startEvent);

        expect(taskStore.increaseTimeoutCount).not.toHaveBeenCalledWith(
            expectedDummyTask.id
        );
        expect(taskStore.increaseTimeoutCount).not.toHaveBeenCalledWith(
            expectedFailedTask.id
        );
        expect(taskStore.increaseTimeoutCount).toHaveBeenCalledWith(
            expectedTimeoutTask.id
        );
    });
});
