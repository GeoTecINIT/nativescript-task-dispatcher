import { PlannedTasksStore } from "../../persistence/planned-tasks-store";
import { PlannedTask } from "../planner/planned-task";
import {
  DispatchableEvent,
  on,
  TaskDispatcherEvent,
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
    startEvent: DispatchableEvent
  ): Promise<void> {
    await Promise.all(
      plannedTasks.map((plannedTask) =>
        this.runTaskWithCustomStartEvent(plannedTask, startEvent)
      )
    );
  }

  private runTaskWithCustomStartEvent(
    plannedTask: PlannedTask,
    batchStartEvent: DispatchableEvent
  ): Promise<void> {
    const startEvent = createEvent(TaskDispatcherEvent.TaskExecutionStarted);
    startEvent.expirationTimestamp = batchStartEvent.expirationTimestamp;
    const listenerId = on(TaskDispatcherEvent.TaskExecutionTimedOut, (evt) => {
      if (evt.id === batchStartEvent.id) {
        off(TaskDispatcherEvent.TaskExecutionTimedOut, listenerId);
        emit(
          createEvent(TaskDispatcherEvent.TaskExecutionTimedOut, {
            id: startEvent.id,
          })
        );
      }
    });

    return this.taskRunner.run(plannedTask, startEvent);
  }
}
