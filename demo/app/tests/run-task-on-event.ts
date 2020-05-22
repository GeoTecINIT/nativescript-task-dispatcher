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
            name: "e2eStartEvent",
            id: uuid(),
            expirationTimestamp: 1588550400,
            data: {},
        };
        stopEvent = {
            name: "e2eStopEvent",
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

        emit(stopEvent);
        await new Promise((resolve) => setTimeout(resolve, 500));

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
        await Promise.all([callbackPromise, chainedEventCallbackPromise]);

        expect(eventCallback).toHaveBeenCalledWith(expectedEvent);
        expect(chainedEventCallback).toHaveBeenCalledWith(expectedEventSlicer);
        off(expectedEventSlicer.name);
    });

    afterAll(() => {
        emit(stopEvent);
        off(startEvent.name);
        off(stopEvent.name);
        off(expectedEvent.name);
    });
});

const testTaskGraph = {
    async describe(onEvt: EventListenerGenerator, run: RunnableTaskDescriptor) {
        onEvt("e2eStartEvent", run("emitterTask"));
        onEvt(
            "e2eStartEvent",
            run("dummyTask").every(1, "minutes").cancelOn("e2eStopEvent")
        );
        onEvt("emitterTaskFinished", run("dummyTask"));
        onEvt("patataCooked", run("patataSlicer"));
    },
};
