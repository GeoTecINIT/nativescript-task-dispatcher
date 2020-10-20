import { Task } from "nativescript-task-dispatcher/internal/tasks/task";
import { SimpleTask } from "nativescript-task-dispatcher/internal/tasks/simple-task";

import { TaskCancelManager } from "nativescript-task-dispatcher/internal/tasks/cancel-manager";
import { PlannedTask } from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";

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
    new SimpleTask(
        "emitterTask",
        async () => ({
            result: { status: "slightlyBaked" },
        }),
        { outputEventNames: ["patataCooked"] }
    ),
    new SimpleTask(
        "patataSlicer",
        async () => ({
            result: { status: "sliced" },
        }),
        { outputEventNames: ["patataSliced"] }
    ),
    new SimpleTask("pongTask", async ({ evt }) => ({ result: evt.data }), {
        outputEventNames: ["pingReceived"],
    }),
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
