import {
    createEvent,
    TaskDispatcherEvent,
    EventCallback,
    on,
    off,
    DispatchableEvent,
} from "nativescript-task-dispatcher/internal/events";
import { SimpleTask } from "nativescript-task-dispatcher/internal/tasks/simple-task";

describe("Task", () => {
    let startEvent: DispatchableEvent;
    const eventData = { previousResult: { status: "ok" } };

    // All tasks remain immutable given that they are meant to be used
    // as single global objects
    const dumbTask = new SimpleTask("dumbTask", () => null);
    const dumbTaskEndEvtName = `${dumbTask.name}Finished`;

    const expectedError = new Error("I told you this would happen");
    const erroneousTask = new SimpleTask("erroneousTask", () => {
        throw expectedError;
    });

    const timeoutTask = new SimpleTask(
        "timeoutTask",
        ({ onCancel }) =>
            new Promise((resolve) => {
                const timeoutId = setTimeout(() => resolve(), 5000);
                onCancel(() => {
                    clearTimeout(timeoutId);
                    resolve();
                });
            })
    );
    const timeoutTaskEndEvtName = `${timeoutTask.name}Finished`;

    const emitterTaskEndEvtName = "emissionCompleted";
    const emitterTask = new SimpleTask(
        "emitterTask",
        async () => ({ result: ":)" }),
        { outputEventNames: [emitterTaskEndEvtName] }
    );

    const parameterizedTaskEndEvtName = "completedWithParams";
    const parameterizedTask = new SimpleTask(
        "parameterizedTask",
        async ({ params }) => ({
            result: { params },
        }),
        { outputEventNames: [parameterizedTaskEndEvtName] }
    );

    const eventualTaskEndEvtName = "completedWithEventData";
    const eventualTask = new SimpleTask(
        "eventualTask",
        async ({ evt }) => ({
            result: { eventData: evt.data },
        }),
        { outputEventNames: [eventualTaskEndEvtName] }
    );

    const foregroundDumbTask = new SimpleTask(
        "foregroundDumbTask",
        () => null,
        { foreground: true }
    );

    // END Tasks definition

    let eventCallback: EventCallback;
    let secondaryCallback: EventCallback;

    beforeEach(() => {
        startEvent = createEvent(TaskDispatcherEvent.TaskExecutionStarted, {
            data: eventData,
        });
        eventCallback = jasmine.createSpy("eventCallback");
        secondaryCallback = jasmine.createSpy("secondaryEventCallback");
    });

    afterEach(() => {
        off(dumbTaskEndEvtName);
        off(timeoutTaskEndEvtName);
        off(emitterTaskEndEvtName);
        off(parameterizedTaskEndEvtName);
        off(eventualTaskEndEvtName);
        off(TaskDispatcherEvent.TaskChainFinished);
    });

    it("runs and emits a default end event", async () => {
        on(dumbTaskEndEvtName, eventCallback);
        on(TaskDispatcherEvent.TaskChainFinished, secondaryCallback);
        await dumbTask.run({}, startEvent);
        const taskFinishedEvt: DispatchableEvent = {
            name: dumbTaskEndEvtName,
            id: startEvent.id,
            timeoutDate: null,
            data: {},
        };
        expect(eventCallback).toHaveBeenCalledWith(taskFinishedEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("runs and reports task chain has finished if no other app component is bound to it", async () => {
        on(TaskDispatcherEvent.TaskChainFinished, eventCallback);
        await dumbTask.run({}, startEvent);
        const taskChainFinishedEvt: DispatchableEvent = {
            name: TaskDispatcherEvent.TaskChainFinished,
            id: startEvent.id,
            timeoutDate: null,
            data: { result: { status: "ok" } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
    });

    it("reports about errors raised during task execution and ends task execution chain", async () => {
        on(TaskDispatcherEvent.TaskChainFinished, eventCallback);
        await expectAsync(erroneousTask.run({}, startEvent)).toBeRejectedWith(
            expectedError
        );
        const taskChainFinishedEvt: DispatchableEvent = {
            name: TaskDispatcherEvent.TaskChainFinished,
            id: startEvent.id,
            timeoutDate: null,
            data: { result: { status: "error", reason: expectedError } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
    });

    it("can be cancelled and reports that the task chain has finished prematurely", async () => {
        on(TaskDispatcherEvent.TaskChainFinished, eventCallback);
        on(timeoutTaskEndEvtName, secondaryCallback);
        setTimeout(() => timeoutTask.cancel(), 100);
        await timeoutTask.run({}, startEvent);
        const taskChainFinishedEvt: DispatchableEvent = {
            name: TaskDispatcherEvent.TaskChainFinished,
            id: startEvent.id,
            timeoutDate: null,
            data: { result: { status: "cancelled" } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("is able to emit custom end events with output data", async () => {
        on(emitterTaskEndEvtName, eventCallback);
        on(TaskDispatcherEvent.TaskChainFinished, secondaryCallback);
        await emitterTask.run({}, startEvent);
        const emitterTaskEndEvt: DispatchableEvent = {
            name: emitterTaskEndEvtName,
            id: startEvent.id,
            timeoutDate: null,
            data: { result: ":)" },
        };
        expect(eventCallback).toHaveBeenCalledWith(emitterTaskEndEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("can use parameters passed by at runtime", async () => {
        on(parameterizedTaskEndEvtName, eventCallback);
        const params = { param0: "a param", param1: 42 };
        await parameterizedTask.run(params, startEvent);
        const parameterizedTaskEvt: DispatchableEvent = {
            name: parameterizedTaskEndEvtName,
            id: startEvent.id,
            timeoutDate: null,
            data: { params },
        };
        expect(eventCallback).toHaveBeenCalledWith(parameterizedTaskEvt);
    });

    it("can use invocation event data", async () => {
        on(eventualTaskEndEvtName, eventCallback);
        await eventualTask.run({}, startEvent);
        const eventualTaskEvt: DispatchableEvent = {
            name: eventualTaskEndEvtName,
            id: startEvent.id,
            timeoutDate: null,
            data: { eventData },
        };
        expect(eventCallback).toHaveBeenCalledWith(eventualTaskEvt);
    });

    it("is able to be configured for foreground execution", async () => {
        const runsInBackground = foregroundDumbTask.runsInBackground();
        expect(runsInBackground).toBeFalsy();
    });
});
