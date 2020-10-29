import { RunnableTask } from "../../runnable-task";
import { DispatchableEvent } from "../../../../events";
import {
  PlannedTask,
  PlanningType,
  SchedulerType,
} from "../../planner/planned-task";
import { PlannedTasksStore } from "../../../persistence/planned-tasks-store";
import { checkIfTaskExists } from "../../provider";
import { SingleTaskRunner } from "../../runners/single-task-runner";

export class InstantTaskRunner implements TaskRunner {
  private taskRunner: SingleTaskRunner;

  constructor(private taskStore: PlannedTasksStore) {
    this.taskRunner = new SingleTaskRunner(taskStore);
  }

  async run(
    task: RunnableTask,
    dispatchableEvent: DispatchableEvent
  ): Promise<PlannedTask> {
    checkIfTaskExists(task.name);

    let plannedTask = await this.taskStore.get(task);
    if (!plannedTask) {
      plannedTask = new PlannedTask(
        PlanningType.Immediate,
        SchedulerType.None,
        task
      );
      await this.taskStore.insert(plannedTask);
    }

    await this.taskRunner.run(plannedTask, dispatchableEvent);

    return this.taskStore.get(plannedTask.id);
  }
}

export interface TaskRunner {
  run(
    task: RunnableTask,
    dispatchableEvent: DispatchableEvent
  ): Promise<PlannedTask>;
}
