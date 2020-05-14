import { TaskPlanner } from "nativescript-task-dispatcher/internal/tasks/planner";
import { TaskScheduler } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import { RunnableTaskBuilderImpl } from "nativescript-task-dispatcher/internal/tasks/runnable-task/builder";
import {
    DispatchableEvent,
    TaskDispatcherEvent,
    EventCallback,
    on,
    createEvent,
    off,
} from "nativescript-task-dispatcher/internal/events";
import {
    PlannedTask,
    PlanningType,
    SchedulerType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";
import { createPlannedTaskStoreMock } from "../persistence";
import { createTaskCancelManagerMock } from ".";
import { TaskNotFoundError } from "nativescript-task-dispatcher/internal/tasks/provider";
import { TaskRunner } from "nativescript-task-dispatcher/internal/tasks/schedulers/immediate/instant-task-runner";

describe("Task planner", () => {
    const taskScheduler = createTaskSchedulerMock();
    const taskRunner = createTaskRunnerMock();
    const taskStore = createPlannedTaskStoreMock();
    const cancelManager = createTaskCancelManagerMock();
    const taskPlanner = new TaskPlanner(
        taskScheduler,
        taskRunner,
        taskStore,
        cancelManager
    );

    const dummyEvent: DispatchableEvent = {
        name: "dummyEvent",
        id: "unknown",
        data: {},
    };

    const immediateTask = new RunnableTaskBuilderImpl("dummyTask", {})
        .now()
        .build();
    const recurrentTask = new RunnableTaskBuilderImpl("dummyTask", {})
        .every(10)
        .build();
    const oneShotTask = new RunnableTaskBuilderImpl("dummyTask", {})
        .in(10)
        .build();
    const delayedTask = new RunnableTaskBuilderImpl("dummyTask", {})
        .at(new Date(new Date().getTime() + 3600 * 1000))
        .build();

    const immediatePlannedTask = new PlannedTask(
        PlanningType.Immediate,
        SchedulerType.None,
        immediateTask
    );

    const recurrentPlannedTask = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        recurrentTask
    );

    let dummyCallback: EventCallback;

    beforeEach(() => {
        spyOn(taskScheduler, "schedule").and.returnValue(
            Promise.resolve(recurrentPlannedTask)
        );
        spyOn(taskRunner, "run").and.returnValue(
            Promise.resolve(immediatePlannedTask)
        );
        spyOn(cancelManager, "add");
        dummyCallback = jasmine.createSpy();
    });

    it("runs a task immediately", async () => {
        await taskPlanner.plan(immediateTask, dummyEvent);
        expect(taskRunner.run).toHaveBeenCalledWith(immediateTask, dummyEvent);
        expect(cancelManager.add).toHaveBeenCalledWith(immediatePlannedTask);
    });

    it("schedules a recurrent task in time", async () => {
        on(TaskDispatcherEvent.TaskChainFinished, dummyCallback);
        await taskPlanner.plan(recurrentTask, dummyEvent);
        expect(taskScheduler.schedule).toHaveBeenCalledWith(recurrentTask);
        expect(dummyCallback).toHaveBeenCalled();
        expect(cancelManager.add).toHaveBeenCalledWith(recurrentPlannedTask);
    });

    it("schedules a one-shot task in time", async () => {
        on(TaskDispatcherEvent.TaskChainFinished, dummyCallback);
        await taskPlanner.plan(oneShotTask, dummyEvent);
        expect(taskScheduler.schedule).toHaveBeenCalledWith(oneShotTask);
        expect(dummyCallback).toHaveBeenCalled();
    });

    it("schedules a delayed task in time", async () => {
        on(TaskDispatcherEvent.TaskChainFinished, dummyCallback);
        await taskPlanner.plan(delayedTask, dummyEvent);
        expect(taskScheduler.schedule).toHaveBeenCalledWith(delayedTask);
        expect(dummyCallback).toHaveBeenCalled();
    });

    it("raises an error when task is unknown", async () => {
        const unknownTask: RunnableTask = {
            name: "patata",
            startAt: -1,
            interval: 60,
            recurrent: false,
            params: {},
        };
        const errorEvent = createEvent(TaskDispatcherEvent.TaskChainFinished, {
            id: dummyEvent.id,
            data: {
                result: {
                    status: "error",
                    reason: new TaskNotFoundError(unknownTask.name),
                },
            },
        });
        on(TaskDispatcherEvent.TaskChainFinished, dummyCallback);
        await expectAsync(
            taskPlanner.plan(unknownTask, dummyEvent)
        ).toBeRejectedWith(new TaskNotFoundError(unknownTask.name));
        expect(dummyCallback).toHaveBeenCalledWith(errorEvent);
    });

    it("runs an immediate task already run", async () => {
        spyOn(taskStore, "get")
            .withArgs(immediateTask)
            .and.returnValue(Promise.resolve(immediatePlannedTask));
        const plannedTask = await taskPlanner.plan(immediateTask, dummyEvent);
        expect(plannedTask).toBe(immediatePlannedTask);
        expect(taskScheduler.schedule).not.toHaveBeenCalled();
        expect(taskRunner.run).toHaveBeenCalled();
        expect(cancelManager.add).not.toHaveBeenCalled();
    });

    it("does nothing when a task has already been scheduled and its recurrent", async () => {
        spyOn(taskStore, "get")
            .withArgs(recurrentTask)
            .and.returnValue(Promise.resolve(recurrentPlannedTask));
        const plannedTask = await taskPlanner.plan(recurrentTask, dummyEvent);
        expect(plannedTask).toBe(recurrentPlannedTask);
        expect(taskScheduler.schedule).not.toHaveBeenCalled();
        expect(taskRunner.run).not.toHaveBeenCalled();
        expect(cancelManager.add).not.toHaveBeenCalled();
    });

    afterEach(() => {
        off(TaskDispatcherEvent.TaskChainFinished);
    });
});

function createTaskSchedulerMock(): TaskScheduler {
    return {
        schedule(task: RunnableTask): Promise<PlannedTask> {
            return Promise.resolve(null);
        },
        cancel(id: string): Promise<void> {
            return Promise.resolve();
        },
    };
}

function createTaskRunnerMock(): TaskRunner {
    return {
        run(
            task: RunnableTask,
            dispatchableEvent: DispatchableEvent
        ): Promise<PlannedTask> {
            return Promise.resolve(null);
        },
    };
}
