import { setTasks } from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "./internal/tasks";
import {
    on,
    emit,
    off,
    PlatformEvent,
    EventCallback,
} from "nativescript-task-dispatcher/internal/events";
import { uuid } from "nativescript-task-dispatcher/internal/utils/uuid";
import { TaskGraphLoader } from "nativescript-task-dispatcher/internal/tasks/graph/loader";
import {
    TaskEventBinder,
    RunnableTaskDescriptor,
} from "nativescript-task-dispatcher/internal/tasks/graph";

describe("Event-based task runner", () => {
    setTasks(testTasks);

    let taskGraph: TaskGraphLoader;

    let eventCallback: EventCallback;

    let startEvent: PlatformEvent;
    let stopEvent: PlatformEvent;
    let expectedEvent: PlatformEvent;

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

    it("does not run a task if it has been stopped", async () => {
        await taskGraph.load(testTaskGraph);
        const callbackPromise = new Promise((resolve, reject) => {
            setTimeout(() => resolve(), 2000);
            on(expectedEvent.name, (evt) => {
                eventCallback(evt);
                reject(new Error("Callback should not be called"));
            });
        });

        emit(stopEvent);
        emit(startEvent);
        await callbackPromise;

        expect(eventCallback).not.toHaveBeenCalled();
    });

    afterEach(() => {
        off(startEvent.name);
        off(stopEvent.name);
        off(expectedEvent.name);
    });
});

const testTaskGraph = {
    async describe(onEvt: TaskEventBinder, run: RunnableTaskDescriptor) {
        onEvt("startEvent", run("emitterTask").now().cancelOn("stopEvent"));
    },
};
