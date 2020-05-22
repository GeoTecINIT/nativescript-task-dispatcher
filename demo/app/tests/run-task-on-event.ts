import { setTasks } from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "./internal/tasks";
import {
    on,
    emit,
    off,
    DispatchableEvent,
    EventCallback,
} from "nativescript-task-dispatcher/internal/events";
import { uuid } from "nativescript-task-dispatcher/internal/utils/uuid";
import { TaskGraphLoader } from "nativescript-task-dispatcher/internal/tasks/graph/loader";
import {
    EventListenerGenerator,
    RunnableTaskDescriptor,
} from "nativescript-task-dispatcher/internal/tasks/graph";
import { plannedTasksDB } from "nativescript-task-dispatcher/internal/persistence/planned-tasks-store";

// TODO: Update E2E tests
describe("Event-based task runner", () => {
    setTasks(testTasks);

    let taskGraph: TaskGraphLoader;

    let eventCallback: EventCallback;

    let startEvent: DispatchableEvent;
    let stopEvent: DispatchableEvent;
    let expectedEvent: DispatchableEvent;
    let expectedEventSlicer: DispatchableEvent;

    beforeEach(() => {
        taskGraph = new TaskGraphLoader();
        eventCallback = jasmine.createSpy("eventCallback");
        startEvent = {
            name: "startEvent",
            id: uuid(),
            expirationTimestamp: 1588550400,
            data: {},
        };
        stopEvent = {
            name: "stopEvent",
            id: uuid(),
            expirationTimestamp: -1,
            data: {},
        };
        expectedEvent = {
            name: "patataCooked",
            id: startEvent.id,
            expirationTimestamp: 1588550400,
            data: { status: "slightlyBaked" },
        };
        expectedEventSlicer = {
            name: "patataSliced",
            id: startEvent.id,
            expirationTimestamp: 1588550400,
            data: { status: "sliced" },
        };
    });

    it("runs a task at the moment an event rises", async () => {
        await taskGraph.load(testTaskGraph);
        const callbackPromise = new Promise((resolve) => {
            on(expectedEvent.name, (evt) => {
                eventCallback(evt);
                resolve();
            });
        });

        emit(startEvent);
        await callbackPromise;

        expect(eventCallback).toHaveBeenCalledWith(expectedEvent);
    });

    it("removes a delayed task if it has been canceled", async () => {
        await taskGraph.load(testTaskGraph);
        const done = new Promise((resolve) => {
            const listenerId = on(stopEvent.name, (evt) => {
                if (evt.id === stopEvent.id) {
                    off(stopEvent.name, listenerId);
                    resolve();
                }
            });
        });

        emit(stopEvent);
        await done;

        const plannedTask = await plannedTasksDB.get({
            name: "dummyTask",
            startAt: -1,
            interval: 60000,
            recurrent: true,
            params: {},
        });
        expect(plannedTask).toBeNull();
    });

    it("runs a chained tasks secuence", async () => {
        await taskGraph.load(testTaskGraph);
        const callbackPromise = new Promise((resolve) => {
            on(expectedEvent.name, (evt) => {
                eventCallback(evt);
                resolve();
            });
        });

        const chainedEventCallback = jasmine.createSpy("eventCallback");
        const chainedEventCallbackPromise = new Promise((resolve) => {
            on(expectedEventSlicer.name, (evt) => {
                chainedEventCallback(evt);
                resolve();
            });
        });

        emit(startEvent);
        await callbackPromise;
        await chainedEventCallbackPromise;

        expect(eventCallback).toHaveBeenCalledWith(expectedEvent);
        expect(chainedEventCallback).toHaveBeenCalledWith(expectedEventSlicer);
        off(expectedEventSlicer.name);
    });

    afterEach(() => {
        off(startEvent.name);
        off(stopEvent.name);
        off(expectedEvent.name);
    });

    afterAll(() => {
        emit(stopEvent);
    });
});

const testTaskGraph = {
    async describe(onEvt: EventListenerGenerator, run: RunnableTaskDescriptor) {
        onEvt("startEvent", run("emitterTask"));
        onEvt(
            "startEvent",
            run("dummyTask").every(1, "minutes").cancelOn("stopEvent")
        );
        onEvt("emitterTaskFinished", run("dummyTask"));
        onEvt("patataCooked", run("patataSlicer"));
    },
};
