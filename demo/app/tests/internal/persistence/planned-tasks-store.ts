import {
    plannedTasksDB,
    PlannedTaskAlreadyExistsError,
} from "nativescript-task-dispatcher/internal/persistence/planned-tasks-store";
import {
    PlannedTask,
    PlanningType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";

describe("Planned Tasks Store", () => {
    const store = plannedTasksDB;

    const runnableTask1: RunnableTask = {
        name: "dummyTask1",
        startAt: -1,
        interval: 120000,
        recurrent: true,
        params: { param1: "patata1" },
        cancelEvent: "cancelEvent",
    };
    const runnableTask2: RunnableTask = {
        name: "dummyTask2",
        startAt: new Date().getTime(),
        interval: 60000,
        recurrent: true,
        params: { param1: "patata1", param2: "patata2" },
        cancelEvent: "otherEvent",
    };
    const runnableTask3: RunnableTask = {
        name: "dummyTask3",
        startAt: new Date().getTime() + 900000,
        interval: 150000,
        recurrent: true,
        params: {},
        cancelEvent: "cancelEvent",
    };

    const runnableTask4: RunnableTask = {
        name: "dummyTask4",
        startAt: new Date().getTime() + 28e6,
        interval: 0,
        recurrent: false,
        params: {},
        cancelEvent: "cancelEvent",
    };

    const plannedTask1 = new PlannedTask(PlanningType.Scheduled, runnableTask1);
    const plannedTask2 = new PlannedTask(PlanningType.Scheduled, runnableTask2);
    const plannedTask3 = new PlannedTask(PlanningType.Scheduled, runnableTask3);

    const plannedTask4: PlannedTask = new PlannedTask(
        PlanningType.Immediate,
        runnableTask4
    );

    beforeEach(async () => {
        await store.deleteAll();
        await store.insert(plannedTask1);
    });

    it("saves a planned task permanently", async () => {
        await store.insert(plannedTask2);
    });

    it("throws an error when trying to store an existing task", async () => {
        await expectAsync(store.insert(plannedTask1)).toBeRejectedWith(
            new PlannedTaskAlreadyExistsError(plannedTask1)
        );
    });

    it("deletes a stored task", async () => {
        await store.delete(plannedTask1.id);
        const task = await store.get(runnableTask1);
        expect(task).toBeNull();
    });

    it("gets a stored task by similarity criteria", async () => {
        const task = await store.get(runnableTask1);
        expect(task).toEqual(plannedTask1);
    });

    it("gets a stored task by id", async () => {
        const task = await store.get(plannedTask1.id);
        expect(task).toEqual(plannedTask1);
    });

    it("gets all stored task ordered by interval", async () => {
        await store.deleteAll();
        await store.insert(plannedTask1);
        await store.insert(plannedTask2);
        await store.insert(plannedTask3);
        await store.insert(plannedTask4);

        const tasks = await store.getAllSortedByNextRun();
        expect(tasks.length).toBe(4);
        const now = new Date().getTime();
        for (let i = 0; i < tasks.length - 1; i++) {
            if (tasks[i].nextRun(now) > tasks[i + 1].nextRun(now)) {
                fail("Tasks out of order");
            }
        }
    });

    it("gets all stored task filtered by type and ordered by interval", async () => {
        await store.deleteAll();
        await store.insert(plannedTask1);
        await store.insert(plannedTask2);
        await store.insert(plannedTask3);
        await store.insert(plannedTask4);

        const tasks = await store.getAllSortedByNextRun(PlanningType.Scheduled);
        expect(tasks.length).toBe(3);
        const now = new Date().getTime();
        for (let i = 0; i < tasks.length - 1; i++) {
            if (tasks[i].nextRun(now) > tasks[i + 1].nextRun(now)) {
                fail("Tasks out of order");
            }
        }
    });

    it("gets a unique set of cancellation events of the stored tasks", async () => {
        await store.deleteAll();
        await store.insert(plannedTask1);
        await store.insert(plannedTask2);
        await store.insert(plannedTask3);
        await store.insert(plannedTask4);

        const cancellationEvents = await store.getAllCancelEvents();
        expect(cancellationEvents.length).toBe(2);
        expect(cancellationEvents.indexOf("cancelEvent") !== -1);
        expect(cancellationEvents.indexOf("otherEvent") !== -1);
    });

    it("gets stored tasks with the same cancelEvent", async () => {
        await store.deleteAll();
        await store.insert(plannedTask1);
        await store.insert(plannedTask2);
        await store.insert(plannedTask3);
        await store.insert(plannedTask4);

        const cancelEventTasks = await store.getAllFilteredByCancelEvent(
            "cancelEvent"
        );
        const otherEventTasks = await store.getAllFilteredByCancelEvent(
            "otherEvent"
        );
        expect(cancelEventTasks.length).toBe(3);
        expect(otherEventTasks.length).toBe(1);
    });

    it("increases error count of a task by id", async () => {
        await store.increaseErrorCount(plannedTask1.id);
        const task = await store.get(plannedTask1.id);
        expect(task.errorCount).toBe(plannedTask1.errorCount + 1);
    });

    it("increases timeout count of a task by id", async () => {
        await store.increaseTimeoutCount(plannedTask1.id);
        const task = await store.get(plannedTask1.id);
        expect(task.timeoutCount).toBe(plannedTask1.timeoutCount + 1);
    });

    it("updates last run of a task by id", async () => {
        const timestamp = 1000;
        await store.updateLastRun(plannedTask1.id, timestamp);
        const task = await store.get(plannedTask1.id);
        expect(task.lastRun).toBe(timestamp);
    });

    it("deletes all the stored tasks", async () => {
        await store.deleteAll();
        const tasks = await store.getAllSortedByNextRun();
        expect(tasks.length).toBe(0);
    });

    afterAll(async () => {
        await store.deleteAll();
    });
});
