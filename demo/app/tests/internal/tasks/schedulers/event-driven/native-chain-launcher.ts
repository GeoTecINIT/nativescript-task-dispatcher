import { android as androidApp } from "tns-core-modules/application/application";

import { setTasks } from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "../..";
import { TaskChainLauncher } from "nativescript-task-dispatcher/internal/tasks/schedulers/event-driven";
import { AndroidTaskChainLauncher } from "nativescript-task-dispatcher/internal/tasks/schedulers/event-driven/android";
import { TaskScheduler } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based";
import { AndroidTaskScheduler } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based/android";

import {
    on,
    TaskDispatcherEvent,
    off,
} from "nativescript-task-dispatcher/internal/events";
import { run } from "nativescript-task-dispatcher/internal/tasks";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import { plannedTasksDB } from "nativescript-task-dispatcher/internal/persistence/planned-tasks-store";

describe("Native task chain launcher", () => {
    setTasks(testTasks);
    let taskChainLauncher: TaskChainLauncher;
    let taskScheduler: TaskScheduler;

    beforeEach(() => {
        if (androidApp) {
            taskChainLauncher = new AndroidTaskChainLauncher();
            taskScheduler = new AndroidTaskScheduler();
        } else {
            taskChainLauncher = null; // TODO: Add iOS task chain launcher
            taskScheduler = null; // TODO: Add iOS task scheduler
        }
    });

    it("runs a single task dependant on a launch event", async () => {
        const chainId = "simpleTaskChain";
        const chainFinished = createTaskChainFinishedListener(chainId);
        const launchEventName = createSimpleTaskChain();

        taskChainLauncher.launch(launchEventName, {}, chainId);
        await chainFinished;

        unregisterEventListeners([launchEventName]);
    });

    it("runs a task chain composed by multiple tasks bootstrapped by a launch event", async () => {
        const chainId = "advancedTaskChain";
        const chainFinished = createTaskChainFinishedListener(chainId);
        const eventNames = createAdvancedTaskChain();

        taskChainLauncher.launch(eventNames[0], {}, chainId);
        await chainFinished;

        unregisterEventListeners(eventNames);
    });

    it("runs two task chains in parallel if they fit in the same time window", async () => {
        const simpleChainId = "simpleTaskChain";
        const simpleChainFinished = createTaskChainFinishedListener(
            simpleChainId
        );
        const simpleLaunchEventName = createSimpleTaskChain();

        const advancedChainId = "anotherAdvancedTaskChain";
        const advancedChainFinished = createTaskChainFinishedListener(
            advancedChainId
        );
        const advancedEventNames = createAdvancedTaskChain();

        taskChainLauncher.launch(simpleLaunchEventName, {}, simpleChainId);
        taskChainLauncher.launch(advancedEventNames[0], {}, advancedChainId);

        await Promise.all([simpleChainFinished, advancedChainFinished]);
        unregisterEventListeners([
            simpleLaunchEventName,
            ...advancedEventNames,
        ]);
    });

    it("schedules a task in time as a reaction to an external event", async () => {
        const [
            launchEventName,
            runnableDeferredTask,
        ] = createDeferredTaskChain();

        taskChainLauncher.launch(launchEventName);
        await new Promise((resolve) => setTimeout(() => resolve(), 500));

        const deferredTask = await plannedTasksDB.get(runnableDeferredTask);
        expect(deferredTask).not.toBeNull();
        taskScheduler.cancel(deferredTask.id);
    });
});

function createSimpleTaskChain(): string {
    const launchEvent = "simpleTaskChainCanStart";
    on(launchEvent, run("timeoutTask"));
    return launchEvent;
}

function createAdvancedTaskChain(): Array<string> {
    const launchEvent = "advancedTaskChainCanStart";
    on(launchEvent, run("dummyTask"));
    const intermediateEvent = "dummyTaskFinished";
    on(intermediateEvent, run("emitterTask"));
    return [launchEvent, intermediateEvent];
}

function createDeferredTaskChain(): [string, RunnableTask] {
    const launchEvent = "deferredTaskChainCanStart";
    const taskName = "dummyTask";
    const interval = 60000;
    on(launchEvent, run(taskName).every(interval));
    return [
        launchEvent,
        { name: taskName, startAt: -1, interval, recurrent: true, params: {} },
    ];
}

function createTaskChainFinishedListener(chainId: string): Promise<void> {
    return new Promise((resolve) => {
        const listenerId = on(TaskDispatcherEvent.TaskChainFinished, (evt) => {
            if (evt.id === chainId) {
                off(TaskDispatcherEvent.TaskChainFinished, listenerId);
                resolve();
            }
        });
    });
}

function unregisterEventListeners(eventNames: Array<string>) {
    eventNames.forEach((eventName) => off(eventName));
}
