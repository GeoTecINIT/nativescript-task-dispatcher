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

describe("Event-based task runner", () => {
    setTasks(testTasks);

    let taskGraph: TaskGraphLoader;

    let eventCallback: EventCallback;

    let startEvent: DispatchableEvent;
    let stopEvent: DispatchableEvent;
    let expectedEvent: DispatchableEvent;

    beforeEach(() => {
        taskGraph = new TaskGraphLoader();
        eventCallback = jasmine.createSpy("eventCallback");
        startEvent = {
            name: "startEvent",
            id: uuid(),
            data: {},
        };
        stopEvent = {
            name: "stopEvent",
            id: uuid(),
            data: {},
        };
        expectedEvent = {
            name: "patataCooked",
            id: startEvent.id,
            data: { status: "slightlyBaked" },
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

        const plannedTask = await plannedTasksDB.get({
            name: "dummyTask",
            startAt: -1,
            interval: 60000,
            recurrent: true,
            params: {},
        });
        expect(plannedTask).toBeNull();
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
    },
};
