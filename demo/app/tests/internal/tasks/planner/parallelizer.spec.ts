import {
    createEvent,
    DispatchableEvent,
} from "nativescript-task-dispatcher/internal/events";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import { RunnableTaskBuilderImpl } from "nativescript-task-dispatcher/internal/tasks/runnable-task/builder";

import { TaskGraphBrowser } from "nativescript-task-dispatcher/internal/tasks/graph/browser";
import { createTaskGraphBrowserMock } from "../mocks";
import { TaskPlannerParallelizer } from "nativescript-task-dispatcher/internal/tasks/planner/parallelizer";

import { listenToEventTrigger } from "nativescript-task-dispatcher/testing/events";
import {
    emit,
    TaskDispatcherEvent,
} from "../../../../../../src/internal/events";
import {
    TaskChain,
    TaskResultStatus,
} from "nativescript-task-dispatcher/internal/tasks/task-chain";

describe("Task planner parallelizer", () => {
    let parentEvent: DispatchableEvent;
    const siblingTasks = createFakeRunnableTasksList();

    let graphBrowser: TaskGraphBrowser;
    let parallelizer: TaskPlannerParallelizer;

    beforeEach(() => {
        parentEvent = createEvent("parentEvent", {
            data: { some: "data" },
            expirationTimestamp: 1584226800000,
        });
        graphBrowser = createTaskGraphBrowserMock();
        parallelizer = new TaskPlannerParallelizer(graphBrowser);
    });

    it("returns the same event when it triggers only one task", () => {
        spyOn(graphBrowser, "getTriggeredBy")
            .withArgs(parentEvent.name)
            .and.returnValue([{ ...siblingTasks[0] }]);

        const childEvent = parallelizer.spawnChildEvent(parentEvent);
        expect(childEvent).toBe(parentEvent);
    });

    it("creates two child events when an event triggers two tasks", () => {
        spyOn(graphBrowser, "getTriggeredBy")
            .withArgs(parentEvent.name)
            .and.returnValue(siblingTasks);

        const firstChildEvent = parallelizer.spawnChildEvent(parentEvent);
        const secondChildEvent = parallelizer.spawnChildEvent(parentEvent);
        const childEvents = [firstChildEvent, secondChildEvent];

        for (let childEvent of childEvents) {
            expect(childEvent).not.toBe(parentEvent);
            expect(childEvent.name).toEqual(parentEvent.name);
            expect(childEvent.expirationTimestamp).toEqual(
                parentEvent.expirationTimestamp
            );
            expect(childEvent.data).toEqual(parentEvent.data);
        }
        expect(firstChildEvent.id).not.toEqual(secondChildEvent.id);
    });

    it("waits for spawned task chains to finish its execution before emitting a finalization event", async () => {
        spyOn(graphBrowser, "getTriggeredBy")
            .withArgs(parentEvent.name)
            .and.returnValue(siblingTasks);

        const firstChildEvent = parallelizer.spawnChildEvent(parentEvent);
        const secondChildEvent = parallelizer.spawnChildEvent(parentEvent);

        const done = listenToEventTrigger(
            TaskDispatcherEvent.TaskChainFinished,
            parentEvent.id
        );
        TaskChain.finalize(firstChildEvent.id, TaskResultStatus.Ok);
        const state = await Promise.race([done, Promise.resolve("pending")]);
        expect(state).toEqual("pending");

        TaskChain.finalize(secondChildEvent.id, TaskResultStatus.Ok);
        const { result } = await done;
        expect(result.status).toBe(TaskResultStatus.Ok);
    });

    it("propagates the rise of a timeout event to its child task chains", async () => {
        spyOn(graphBrowser, "getTriggeredBy")
            .withArgs(parentEvent.name)
            .and.returnValue(siblingTasks);

        const firstChildEvent = parallelizer.spawnChildEvent(parentEvent);
        const secondChildEvent = parallelizer.spawnChildEvent(parentEvent);

        const firstChildNotified = listenToEventTrigger(
            TaskDispatcherEvent.TaskExecutionTimedOut,
            firstChildEvent.id
        );
        const secondChildNotified = listenToEventTrigger(
            TaskDispatcherEvent.TaskExecutionTimedOut,
            secondChildEvent.id
        );

        emit(
            createEvent(TaskDispatcherEvent.TaskExecutionTimedOut, {
                id: parentEvent.id,
            })
        );

        await Promise.all([firstChildNotified, secondChildNotified]);
    });

    it("waits for spawned task chains to finish its execution after timeout has risen", async () => {
        spyOn(graphBrowser, "getTriggeredBy")
            .withArgs(parentEvent.name)
            .and.returnValue(siblingTasks);

        const firstChildEvent = parallelizer.spawnChildEvent(parentEvent);
        const secondChildEvent = parallelizer.spawnChildEvent(parentEvent);

        const done = listenToEventTrigger(
            TaskDispatcherEvent.TaskChainFinished,
            parentEvent.id
        );

        emit(
            createEvent(TaskDispatcherEvent.TaskExecutionTimedOut, {
                id: parentEvent.id,
            })
        );
        TaskChain.finalize(firstChildEvent.id, TaskResultStatus.Cancelled);
        TaskChain.finalize(secondChildEvent.id, TaskResultStatus.Cancelled);

        const { result } = await done;
        expect(result.status).toBe(TaskResultStatus.Cancelled);
    });
});

function createFakeRunnableTasksList(): Array<RunnableTask> {
    return [
        new RunnableTaskBuilderImpl("firstSiblingTask", {}).build(),
        new RunnableTaskBuilderImpl("secondSiblingTask", {}).build(),
    ];
}
