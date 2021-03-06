import { TaskCancelManager } from "nativescript-task-dispatcher/internal/tasks/cancel-manager";
import { PlannedTask } from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";
import {
    GraphEntry,
    GraphTask,
    TaskGraphBrowser,
} from "nativescript-task-dispatcher/internal/tasks/graph/browser";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";

export function createTaskCancelManagerMock(): TaskCancelManager {
    return {
        init() {
            return Promise.resolve();
        },
        add(plannedTask: PlannedTask) {
            return null;
        },
    } as TaskCancelManager;
}

export function createTaskGraphBrowserMock(): TaskGraphBrowser {
    return {
        addEntry(invocationEvent: string, runnableTask: RunnableTask) {},
        getTriggeredBy(invocationEvent: string): Array<RunnableTask> {
            return [];
        },
        any(matcher: any) {
            return false;
        },
        anyFrom(eventName: string, matcher: any) {
            return false;
        },
        depict(): Array<GraphEntry> {
            return [];
        },
        walkFrom(eventName: string): Array<GraphTask> {
            return [];
        },
    } as TaskGraphBrowser;
}
