import { PlannedTasksStore } from "../../persistence/planned-tasks-store";
import { PlannedTask } from "../planner/planned-task";
import {
  PlatformEvent,
  on,
  CoreEvent,
  off,
  createEvent,
  emit,
} from "../../events";
import { SingleTaskRunner } from "./single-task-runner";

export class BatchTaskRunner {
  private taskRunner: SingleTaskRunner;

  constructor(taskStore: PlannedTasksStore) {
    this.taskRunner = new SingleTaskRunner(taskStore);
  }

  async run(
    plannedTasks: Array<PlannedTask>,
    startEvent: PlatformEvent
  ): Promise<void> {
    await Promise.all(
      plannedTasks.map((plannedTask) =>
        this.runTaskWithCustomStartEvent(plannedTask, startEvent.id)
      )
    );
  }

  private runTaskWithCustomStartEvent(
    plannedTask: PlannedTask,
    batchStartId: string
  ): Promise<void> {
    const startEvent = createEvent(CoreEvent.TaskExecutionStarted);
    const listenerId = on(CoreEvent.TaskExecutionTimedOut, (evt) => {
      if (evt.id === batchStartId) {
        off(CoreEvent.TaskExecutionTimedOut, listenerId);
        emit(
          createEvent(CoreEvent.TaskExecutionTimedOut, {
            id: startEvent.id,
          })
        );
      }
    });

    return this.taskRunner.run(plannedTask, startEvent);
  }
}
