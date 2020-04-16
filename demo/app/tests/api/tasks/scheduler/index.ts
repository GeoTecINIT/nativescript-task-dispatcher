import {
    TaskNotFoundError,
    setTasks,
} from "nativescript-task-dispatcher/api/tasks/provider";
import { testTasks } from "..";
import {
    TaskScheduler,
    taskScheduler,
} from "nativescript-task-dispatcher/api/tasks/scheduler";
import { plannedTasksDB } from "nativescript-task-dispatcher/api/persistence/planned-tasks-store";
import { RunnableTask } from "nativescript-task-dispatcher/api/tasks/runnable-task";

describe("Task scheduler", () => {
    setTasks(testTasks);

    let scheduler: TaskScheduler;

    beforeEach(() => {
        scheduler = taskScheduler();
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
