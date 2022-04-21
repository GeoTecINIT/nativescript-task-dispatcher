import {
    createEvent,
    TaskDispatcherEvent,
    EventCallback,
    on,
    off,
    DispatchableEvent,
} from "nativescript-task-dispatcher/internal/events";
import { SimpleTask } from "nativescript-task-dispatcher/internal/tasks/simple-task";
import { listenToEventTrigger } from "nativescript-task-dispatcher/testing/events";

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
    const tasksToRunSequentially = 5;

    beforeEach(() => {
        startEvent = createEvent(TaskDispatcherEvent.TaskExecutionStarted, {
            data: eventData,
        });
        eventCallback = jasmine.createSpy("eventCallback");
        secondaryCallback = jasmine.createSpy("secondaryEventCallback");
    });

    it("runs and emits a default end event", async () => {
        const dumbListenerId = on(dumbTaskEndEvtName, (evt) => {
            off(dumbTaskEndEvtName, dumbListenerId);
            eventCallback(evt);
        });
        const chainListenerId = on(
            TaskDispatcherEvent.TaskChainFinished,

            secondaryCallback
        );
        await dumbTask.run({}, startEvent);
        off(TaskDispatcherEvent.TaskChainFinished, chainListenerId);
        const taskFinishedEvt: DispatchableEvent = {
            name: dumbTaskEndEvtName,
            id: startEvent.id,
            expirationTimestamp: -1,
            data: {},
        };
        expect(eventCallback).toHaveBeenCalledWith(taskFinishedEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("runs and reports task chain has finished if no other app component is bound to it", async () => {
        const listenerId = on(TaskDispatcherEvent.TaskChainFinished, (evt) => {
            off(TaskDispatcherEvent.TaskChainFinished, listenerId);
            eventCallback(evt);
        });
        await dumbTask.run({}, startEvent);
        const taskChainFinishedEvt: DispatchableEvent = {
            name: TaskDispatcherEvent.TaskChainFinished,
            id: startEvent.id,
            expirationTimestamp: -1,
            data: { result: { status: "ok" } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
    });

    it("reports about errors raised during task execution and ends task execution chain", async () => {
        const listenerId = on(TaskDispatcherEvent.TaskChainFinished, (evt) => {
            off(TaskDispatcherEvent.TaskChainFinished, listenerId);
            eventCallback(evt);
        });
        await expectAsync(erroneousTask.run({}, startEvent)).toBeRejectedWith(
            expectedError
        );
        const taskChainFinishedEvt: DispatchableEvent = {
            name: TaskDispatcherEvent.TaskChainFinished,
            id: startEvent.id,
            expirationTimestamp: -1,
            data: { result: { status: "error", reason: expectedError } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
    });

    it("can be cancelled and reports that the task chain has finished prematurely", async () => {
        const chainListenerId = on(
            TaskDispatcherEvent.TaskChainFinished,
            (evt) => {
                off(TaskDispatcherEvent.TaskChainFinished, chainListenerId);
                eventCallback(evt);
            }
        );
        const timeoutListenerId = on(timeoutTaskEndEvtName, secondaryCallback);
        setTimeout(() => timeoutTask.cancel(), 100);
        await timeoutTask.run({}, startEvent);
        off(timeoutTaskEndEvtName, timeoutListenerId);
        const taskChainFinishedEvt: DispatchableEvent = {
            name: TaskDispatcherEvent.TaskChainFinished,
            id: startEvent.id,
            expirationTimestamp: -1,
            data: { result: { status: "cancelled" } },
        };
        expect(eventCallback).toHaveBeenCalledWith(taskChainFinishedEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("is able to emit custom end events with output data", async () => {
        const endListenerId = on(emitterTaskEndEvtName, (evt) => {
            off(emitterTaskEndEvtName, endListenerId);
            eventCallback(evt);
        });
        const chainListenerId = on(
            TaskDispatcherEvent.TaskChainFinished,
            secondaryCallback
        );
        await emitterTask.run({}, startEvent);
        off(TaskDispatcherEvent.TaskChainFinished, chainListenerId);
        const emitterTaskEndEvt: DispatchableEvent = {
            name: emitterTaskEndEvtName,
            id: startEvent.id,
            expirationTimestamp: -1,
            data: { result: ":)" },
        };
        expect(eventCallback).toHaveBeenCalledWith(emitterTaskEndEvt);
        expect(secondaryCallback).not.toHaveBeenCalled();
    });

    it("can use parameters passed by at runtime", async () => {
        const listenerId = on(parameterizedTaskEndEvtName, (evt) => {
            off(parameterizedTaskEndEvtName, listenerId);
            eventCallback(evt);
        });
        const params = { param0: "a param", param1: 42 };
        await parameterizedTask.run(params, startEvent);
        const parameterizedTaskEvt: DispatchableEvent = {
            name: parameterizedTaskEndEvtName,
            id: startEvent.id,
            expirationTimestamp: -1,
            data: { params },
        };
        expect(eventCallback).toHaveBeenCalledWith(parameterizedTaskEvt);
    });

    it("can use invocation event data", async () => {
        const listenerId = on(eventualTaskEndEvtName, (evt) => {
            off(eventualTaskEndEvtName, listenerId);
            eventCallback(evt);
        });
        await eventualTask.run({}, startEvent);
        const eventualTaskEvt: DispatchableEvent = {
            name: eventualTaskEndEvtName,
            id: startEvent.id,
            expirationTimestamp: -1,
            data: { eventData },
        };
        expect(eventCallback).toHaveBeenCalledWith(eventualTaskEvt);
    });

    it("is able to be configured for foreground execution", async () => {
        const runsInBackground = foregroundDumbTask.runsInBackground();
        expect(runsInBackground).toBeFalsy();
    });

    it("runs multiple times sequentially", async () => {
        const runPromises = [];
        const eventAwaiters = [];
        for (let i = 0; i < tasksToRunSequentially; i++) {
            const sequentialEvent = createEvent(
                TaskDispatcherEvent.TaskExecutionStarted
            );
            const finishedSequentially = listenToEventTrigger(
                dumbTaskEndEvtName,
                sequentialEvent.id
            );

            dumbTask.run({}, sequentialEvent);

            runPromises.push(runPromises);
            eventAwaiters.push(finishedSequentially);
        }

        await Promise.all(runPromises);

        await Promise.all(eventAwaiters);
    });

    it("cancellation affects the running task and those awaiting their execution", async () => {
        const runPromises = [];
        const eventAwaiters = [];
        for (let i = 0; i < tasksToRunSequentially; i++) {
            const sequentialEvent = createEvent(
                TaskDispatcherEvent.TaskExecutionStarted
            );
            const timedOut = listenToEventTrigger(
                TaskDispatcherEvent.TaskChainFinished,
                sequentialEvent.id
            );

            timeoutTask.run({}, sequentialEvent);

            runPromises.push(runPromises);
            eventAwaiters.push(timedOut);
        }

        setTimeout(() => timeoutTask.cancel(), 100);

        await Promise.all(runPromises);

        const results = await Promise.all(eventAwaiters);

        for (const result of results) {
            expect(result).toEqual({ result: { status: "cancelled" } });
        }
    });
});
