import { Task } from "nativescript-task-dispatcher/api/tasks/task";
import { SimpleTask } from "nativescript-task-dispatcher/api/tasks/simple-task";

import { TaskCancelManager } from "nativescript-task-dispatcher/api/tasks/cancel-manager";
import { PlannedTask } from "nativescript-task-dispatcher/api/tasks/planner/planned-task";

export const testTasks: Array<Task> = [
    new SimpleTask("dummyTask", async ({ log }) => log("Dummy Task executed!")),
    new SimpleTask(
        "dummyForegroundTask",
        async ({ log }) => log("Dummy Foreground Task executed!"),
        { foreground: true }
    ),
    new SimpleTask("failedTask", () => {
        throw new Error("BOOOOM!");
    }),
    new SimpleTask(
        "timeoutTask",
        ({ log, onCancel }) =>
            new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    log("Timeout task run!");
                    resolve();
                }, 2000);
                onCancel(() => {
                    clearTimeout(timeoutId);
                    resolve();
                });
            })
    ),
    new SimpleTask("emitterTask", async ({ done }) =>
        done("patataCooked", { status: "slightlyBaked" })
    ),
];

export function createTaskCancelManagerMock(): TaskCancelManager {
    const cancelManager = {
        init() {
            return Promise.resolve();
        },
        add(plannedTask: PlannedTask) {
            return null;
        },
    };

    return cancelManager as TaskCancelManager;
}
