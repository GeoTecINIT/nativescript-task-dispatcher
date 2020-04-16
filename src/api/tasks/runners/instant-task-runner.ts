import { RunnableTask } from "../runnable-task";
import { PlatformEvent } from "../../events";
import { PlannedTask, PlanningType } from "../planner/planned-task";
import { PlannedTasksStore } from "../../persistence/planned-tasks-store";
import { checkIfTaskExists } from "../provider";
import { SingleTaskRunner } from "./single-task-runner";

export class InstantTaskRunner implements TaskRunner {
  private taskRunner: SingleTaskRunner;

  constructor(private taskStore: PlannedTasksStore) {
    this.taskRunner = new SingleTaskRunner(taskStore);
  }

  // FIXME: Instant task runner currently does not support the fork
  // of tasks from a single event in a reliable way.
  // Possible solution: create an in-memory graph at TaskGraphLoader
  // and check and control forks here.
  async run(
    task: RunnableTask,
    platformEvent: PlatformEvent
  ): Promise<PlannedTask> {
    checkIfTaskExists(task.name);

    let plannedTask = await this.taskStore.get(task);
    if (!plannedTask) {
      plannedTask = new PlannedTask(PlanningType.Immediate, task);
      await this.taskStore.insert(plannedTask);
    }

    await this.taskRunner.run(plannedTask, platformEvent);

    return this.taskStore.get(plannedTask.id);
  }
}

export interface TaskRunner {
  run(task: RunnableTask, platformEvent: PlatformEvent): Promise<PlannedTask>;
}