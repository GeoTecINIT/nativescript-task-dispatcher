import {
    setTasks,
    TaskNotFoundError,
} from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "../..";
import { createPlannedTaskStoreMock } from "../../../persistence";
import { InstantTaskRunner } from "nativescript-task-dispatcher/internal/tasks/schedulers/immediate/instant-task-runner";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import {
    createEvent,
    TaskDispatcherEvent,
    DispatchableEvent,
    EventCallback,
    on,
    emit,
} from "nativescript-task-dispatcher/internal/events";
import {
    PlannedTask,
    PlanningType,
    SchedulerType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";

describe("Instant task planner", () => {
    setTasks(testTasks);
    const taskStore = createPlannedTaskStoreMock();
    const taskRunner = new InstantTaskRunner(taskStore);

    let startEvent: DispatchableEvent;
    let expectedEvent: DispatchableEvent;

    const immediateTask: RunnableTask = {
        name: "emitterTask",
        startAt: -1,
        interval: 0,
        recurrent: false,
        params: {},
    };
    const expectedImmediateTask = new PlannedTask(
        PlanningType.Immediate,
        SchedulerType.None,
        immediateTask
    );

    let eventCallback: EventCallback;
    beforeEach(() => {
        startEvent = createEvent(TaskDispatcherEvent.TaskExecutionStarted);
        expectedEvent = createEvent("patataCooked", {
            id: startEvent.id,
            data: { status: "slightlyBaked" },
        });
        eventCallback = jasmine.createSpy();
        spyOn(taskStore, "insert").and.returnValue(Promise.resolve());
        spyOn(taskStore, "updateLastRun").and.returnValue(Promise.resolve());
    });

    it("throws an error when the task does not exist", async () => {
        const unknownTask: RunnableTask = {
            name: "patata",
            startAt: -1,
            interval: 60,
            recurrent: false,
            params: {},
        };
        await expectAsync(
            taskRunner.run(unknownTask, startEvent)
        ).toBeRejectedWith(new TaskNotFoundError(unknownTask.name));
    });

    it("runs new a task immediately", async () => {
        spyOn(taskStore, "get").and.returnValue(Promise.resolve(null));

        on(expectedEvent.name, (evt) => {
            emit(
                createEvent(TaskDispatcherEvent.TaskChainFinished, {
                    id: evt.id,
                })
            );
            eventCallback(evt);
        });
        await taskRunner.run(immediateTask, startEvent);

        expect(taskStore.get).toHaveBeenCalledTimes(2);
        expect(taskStore.insert).toHaveBeenCalled();
        expect(taskStore.updateLastRun).toHaveBeenCalled();
        expect(eventCallback).toHaveBeenCalledWith(expectedEvent);
    });

    it("runs a previously executed task immediately", async () => {
        spyOn(taskStore, "get").and.returnValue(
            Promise.resolve(expectedImmediateTask)
        );

        on(expectedEvent.name, (evt) => {
            emit(
                createEvent(TaskDispatcherEvent.TaskChainFinished, {
                    id: evt.id,
                })
            );
            eventCallback(evt);
        });
        await taskRunner.run(immediateTask, startEvent);

        expect(taskStore.get).toHaveBeenCalledTimes(2);
        expect(taskStore.insert).not.toHaveBeenCalledWith(
            expectedImmediateTask
        );
        expect(taskStore.updateLastRun).toHaveBeenCalledWith(
            expectedImmediateTask.id,
            jasmine.any(Number)
        );
        expect(eventCallback).toHaveBeenCalledWith(expectedEvent);
    });
});
