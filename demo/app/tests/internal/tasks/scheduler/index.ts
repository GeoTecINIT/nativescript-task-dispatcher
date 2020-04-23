import { android as androidApp } from "tns-core-modules/application/application";

import {
    TaskNotFoundError,
    setTasks,
} from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "..";
import { TaskScheduler } from "nativescript-task-dispatcher/internal/tasks/scheduler";
import { plannedTasksDB } from "nativescript-task-dispatcher/internal/persistence/planned-tasks-store";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import { AndroidTaskScheduler } from "../../../../../../src/internal/tasks/scheduler/android";

describe("Task scheduler", () => {
    setTasks(testTasks);

    let scheduler: TaskScheduler;

    beforeEach(() => {
        if (androidApp) {
            scheduler = new AndroidTaskScheduler();
        } else {
            // TODO: Set iOS scheduler here
            scheduler = null;
        }
    });

    it("schedules a job in time", async () => {
        const knownTask: RunnableTask = {
            name: "dummyTask",
            startAt: -1,
            interval: 60,
            recurrent: false,
            params: {},
        };
        const task = await scheduler.schedule(knownTask);
        expect(task).not.toBeNull();
        plannedTasksDB.delete(task.id);
    });

    it("raises an error when task is unknown", async () => {
        const unknownTask: RunnableTask = {
            name: "patata",
            startAt: -1,
            interval: 60,
            recurrent: false,
            params: {},
        };
        await expectAsync(scheduler.schedule(unknownTask)).toBeRejectedWith(
            new TaskNotFoundError(unknownTask.name)
        );
    });
});
