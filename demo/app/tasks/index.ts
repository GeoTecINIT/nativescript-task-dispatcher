import { Task, SimpleTask } from "nativescript-task-dispatcher/tasks";
import { toSeconds } from "nativescript-task-dispatcher/utils/time-converter";

export const appTasks: Array<Task> = [
    new SimpleTask("fastTask", async ({ log }) => log("Fast task run!")),
    new SimpleTask(
        "mediumTask",
        ({ log, onCancel }) =>
            new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    log("Medium task run!");
                    resolve();
                }, 2000);
                onCancel(() => {
                    clearTimeout(timeoutId);
                    resolve();
                });
            })
    ),
    new SimpleTask(
        "slowTask",
        ({ log, onCancel }) =>
            new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    log("Slow task run!");
                    resolve();
                }, 30000);
                onCancel(() => {
                    clearTimeout(timeoutId);
                    resolve();
                });
            }),
        { foreground: true }
    ),
    new SimpleTask("incrementalTask", async ({ params, log, runAgainIn }) => {
        const execCount = params.execCount ? params.execCount : 1;
        const execTime = toSeconds(execCount, "minutes");
        log(`Incremental task: Task run after ${execTime} seconds`);
        runAgainIn(toSeconds(execCount + 1, "minutes"), {
            execCount: execCount + 1,
        });
    }),
];
