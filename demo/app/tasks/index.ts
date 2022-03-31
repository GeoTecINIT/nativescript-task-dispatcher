import { Task, SimpleTask } from "nativescript-task-dispatcher/tasks";
import { toSeconds } from "nativescript-task-dispatcher/utils/time-converter";

export const appTasks: Array<Task> = [
    new SimpleTask("fastTask", async ({ log, remainingTime, params }) => {
        log(`Available time: ${remainingTime()}`);
        log(`Fast task run! With params: ${JSON.stringify(params)}`);
    }),
    new SimpleTask(
        "mediumTask",
        ({ log, onCancel, remainingTime }) =>
            new Promise((resolve) => {
                log(`Available time: ${remainingTime()}`);
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
        ({ log, onCancel, remainingTime }) =>
            new Promise((resolve) => {
                log(`Available time: ${remainingTime()}`);
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
    new SimpleTask("highFrequencySubTasks", async ({ remainingTime }) => {
        new Promise<void>((resolve) => {
            const interval = 5000;
            const intervalId = setInterval(() => {
                console.log("SubTask executed");
                if (remainingTime() < interval) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, interval);
        });
    }),
];
