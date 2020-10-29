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
import { getLogger, Logger } from "../../utils/logger";

export class BatchTaskRunner {
  private readonly taskRunner: SingleTaskRunner;
  private readonly logger: Logger;

  constructor(taskStore: PlannedTasksStore) {
    this.taskRunner = new SingleTaskRunner(taskStore);
    this.logger = getLogger("BatchTaskRunner");
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
    const startEvent = createEvent(TaskDispatcherEvent.TaskExecutionStarted, {
      expirationTimestamp: batchStartEvent.expirationTimestamp,
    });
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
    this.logger.info(
      `Child event (name=${startEvent.name}, id=${startEvent.id}) spawned (invocationId=${batchStartEvent.id})`
    );
    return this.taskRunner.run(plannedTask, startEvent);
  }
}
