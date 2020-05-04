import { TaskGraph, RunnableTaskDescriptor } from ".";
import { Task } from "../task";
import { on, off } from "../../events";
import { run } from "..";
import { getTask, checkIfTaskExists } from "../provider";
import {
  RunnableTaskBuilder,
  ReadyRunnableTaskBuilder,
} from "../runnable-task/builder";
import { TaskCancelManager, taskCancelManager } from "../cancel-manager";
import { Logger, getLogger } from "../../utils/logger";

type TaskEventBinder = (
  eventName: string,
  taskBuilder: ReadyRunnableTaskBuilder
) => number;
type TaskVerifier = (taskName: string) => void;
type TaskProvider = (taskName: string) => Task;

export class TaskGraphLoader {
  private graphTasks: Set<Task>;
  private loadingTaskGraph: Promise<void>;

  private logger: Logger;

  constructor(
    private taskEventBinder: TaskEventBinder = on,
    private runnableTaskDescriptor: RunnableTaskDescriptor = run,
    private taskVerifier: TaskVerifier = checkIfTaskExists,
    private taskProvider: TaskProvider = getTask,
    private cancelManager: TaskCancelManager = taskCancelManager
  ) {
    this.graphTasks = new Set();
  }

  async load(graph: TaskGraph): Promise<void> {
    if (this.loadingTaskGraph) {
      throw new Error("Loading more than one task graph is not permitted");
    }
    const createEventListener = (
      eventName: string,
      taskBuilder: RunnableTaskBuilder
    ) => this.bindTaskToStartAndCancelEvent(eventName, taskBuilder);
    const planTaskToBeRun = (taskName: string) =>
      this.trackTaskGoingToBeRun(taskName);

    this.getLogger().info("Loading task graph");
    this.loadingTaskGraph = graph.describe(
      createEventListener,
      planTaskToBeRun
    );
    await this.loadingTaskGraph;
    await this.cancelManager.init();
  }

  async isReady(): Promise<boolean> {
    const tasksToBePrepared = await this.tasksNotReady();

    return tasksToBePrepared.length === 0;
  }

  async prepare(): Promise<void> {
    const tasksToBePrepared = await this.tasksNotReady();
    this.getLogger().info(`${tasksToBePrepared.length} are up to be prepared`);

    await Promise.all(tasksToBePrepared.map((task) => task.prepare()));
  }

  async tasksNotReady(): Promise<Array<Task>> {
    if (!this.loadingTaskGraph) {
      throw new Error("Load a task graph first!");
    }
    await this.loadingTaskGraph;

    const tasksToBePrepared = [];
    for (const task of this.graphTasks) {
      const hasToBePrepared = await this.hasToBePrepared(task);
      if (hasToBePrepared) {
        tasksToBePrepared.push(task);
      }
    }

    return tasksToBePrepared;
  }

  private bindTaskToStartAndCancelEvent(
    eventName: string,
    taskBuilder: ReadyRunnableTaskBuilder
  ) {
    this.taskEventBinder(eventName, taskBuilder);
  }

  private trackTaskGoingToBeRun(taskName: string) {
    this.taskVerifier(taskName);
    this.graphTasks.add(this.taskProvider(taskName));

    return this.runnableTaskDescriptor(taskName);
  }

  private async hasToBePrepared(task: Task): Promise<boolean> {
    try {
      await task.checkIfCanRun();

      return false;
    } catch (err) {
      return true;
    }
  }

  private getLogger(): Logger {
    if (!this.logger) {
      this.logger = getLogger("TaskGraphLoader");
    }
    return this.logger;
  }
}

export const taskGraph = new TaskGraphLoader();
