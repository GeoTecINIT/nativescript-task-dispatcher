import {
    createEvent,
    CoreEvent,
    EventCallback,
    on,
    off,
    PlatformEvent,
} from "nativescript-task-dispatcher/internal/events";
import { SimpleTask } from "nativescript-task-dispatcher/internal/tasks/simple-task";

describe("Task", () => {
    let startEvent: PlatformEvent;
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
    const emitterTask = new SimpleTask("emitterTask", async ({ done }) =>
        done(emitterTaskEndEvtName, { result: ":)" })
    );

    const parameterizedTaskEndEvtName = "completedWithParams";
    const parameterizedTask = new SimpleTask(
        "parameterizedTask",
        async ({ done, params }) =>
            done(parameterizedTaskEndEvtName, { params })
    );

    const eventualTaskEndEvtName = "completedWithEventData";
    const eventualTask = new SimpleTask("eventualTask", async ({ done, evt }) =>
        done(eventualTaskEndEvtName, { eventData: evt.data })
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
        startEvent = createEvent(CoreEvent.TaskExecutionStarted, {
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
        off(CoreEvent.TaskChainFinished);
    });

    it("runs and emits a default end event", async () => {
        on(dumbTaskEndEvtName, eventCallback);
        on(CoreEvent.TaskChainFinished, secondaryCallback);
        await dumbTask.run({}, startEvent);
        const taskFinishedEvt: PlatformEvent = {
            name: dumbTaskEndEvtName,
            id: startEvent.id,
            data: {},
        };
        expect(eventCallback).toHaveBeenCalledWith(taskFinishedEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("runs and reports task chain has finished if no other app component is bound to it", async () => {
        on(CoreEvent.TaskChainFinished, eventCallback);
        await dumbTask.run({}, startEvent);
        const taskChainFinishedEvt: PlatformEvent = {
            name: CoreEvent.TaskChainFinished,
            id: startEvent.id,
            data: { result: { status: "ok" } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
    });

    it("reports about errors raised during task execution and ends task execution chain", async () => {
        on(CoreEvent.TaskChainFinished, eventCallback);
        await expectAsync(erroneousTask.run({}, startEvent)).toBeRejectedWith(
            expectedError
        );
        const taskChainFinishedEvt: PlatformEvent = {
            name: CoreEvent.TaskChainFinished,
            id: startEvent.id,
            data: { result: { status: "error", reason: expectedError } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
    });

    it("can be cancelled and reports that the task chain has finished prematurely", async () => {
        on(CoreEvent.TaskChainFinished, eventCallback);
        on(timeoutTaskEndEvtName, secondaryCallback);
        setTimeout(() => timeoutTask.cancel(), 100);
        await timeoutTask.run({}, startEvent);
        const taskChainFinishedEvt: PlatformEvent = {
            name: CoreEvent.TaskChainFinished,
            id: startEvent.id,
            data: { result: { status: "cancelled" } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("is able to emit custom end events with output data", async () => {
        on(emitterTaskEndEvtName, eventCallback);
        on(CoreEvent.TaskChainFinished, secondaryCallback);
        await emitterTask.run({}, startEvent);
        const emitterTaskEndEvt: PlatformEvent = {
            name: emitterTaskEndEvtName,
            id: startEvent.id,
            data: { result: ":)" },
        };
        expect(eventCallback).toHaveBeenCalledWith(emitterTaskEndEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("can use parameters passed by at runtime", async () => {
        on(parameterizedTaskEndEvtName, eventCallback);
        const params = { param0: "a param", param1: 42 };
        await parameterizedTask.run(params, startEvent);
        const parameterizedTaskEvt: PlatformEvent = {
            name: parameterizedTaskEndEvtName,
            id: startEvent.id,
            data: { params },
        };
        expect(eventCallback).toHaveBeenCalledWith(parameterizedTaskEvt);
    });

    it("can use invocation event data", async () => {
        on(eventualTaskEndEvtName, eventCallback);
        await eventualTask.run({}, startEvent);
        const eventualTaskEvt: PlatformEvent = {
            name: eventualTaskEndEvtName,
            id: startEvent.id,
            data: { eventData },
        };
        expect(eventCallback).toHaveBeenCalledWith(eventualTaskEvt);
    });

    it("is able to be configured for foreground execution", async () => {
        const runsInBackground = foregroundDumbTask.runsInBackground();
        expect(runsInBackground).toBeFalsy();
    });
});
