import {
    getTask,
    TaskNotFoundError,
    setTasks,
    registerTasks,
} from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from ".";
import { SimpleTask } from "nativescript-task-dispatcher/internal/tasks/simple-task";

describe("Task provider", () => {
    setTasks(testTasks);

    it("throws an error when task os unknown", () => {
        const name = "patata";
        expect(() => getTask(name)).toThrow(new TaskNotFoundError(name));
    });

    it("returns a dummy task", () => {
        const name = "dummyTask";
        const expectedTask = testTasks.find((task) => task.name === name);
        expect(getTask(name)).toBe(expectedTask);
    });

    it("allows to register new tasks", () => {
        const newTask1 = new SimpleTask("aNewTask", async () => null);
        const newTask2 = new SimpleTask("anotherNewTask", async () => null);
        registerTasks([newTask1, newTask2]);
        expect(getTask(newTask1.name)).toBe(newTask1);
        expect(getTask(newTask2.name)).toBe(newTask2);
    });
});
