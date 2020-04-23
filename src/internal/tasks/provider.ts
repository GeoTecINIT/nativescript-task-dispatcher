import { Task } from "./task";

interface Tasks {
  [key: string]: Task;
}

let tasks: Tasks = {};

export function getTask(name: string): Task {
  checkIfTaskExists(name);

  return tasks[name];
}

export function checkIfTaskExists(name: string) {
  const task = tasks[name];
  if (!task) {
    throw new TaskNotFoundError(name);
  }
}

export function registerTasks(newTasks: Array<Task>) {
  for (const task of newTasks) {
    if (tasks[task.name]) {
      throw new Error(
        `Task (${task.name}) name collides with an existing task. Cannot guarantee the correct operation of the system`
      );
    }
    tasks[task.name] = task;
  }
}

export function setTasks(t: Array<Task>) {
  tasks = {};
  registerTasks(t);
}

export class TaskNotFoundError extends Error {
  constructor(name: string) {
    super(`Task not found: ${name}`);
  }
}
