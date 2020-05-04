import { RunnableTask } from "../runnable-task";
import {
  DispatchableEvent,
  emit,
  TaskDispatcherEvent,
  createEvent,
} from "../../events";
import { PlannedTask } from "./planned-task";
import { TaskScheduler, taskScheduler as getTaskScheduler } from "../scheduler";
import {
  PlannedTasksStore,
  plannedTasksDB,
} from "../../persistence/planned-tasks-store";
import { checkIfTaskExists } from "../provider";
import { TaskRunner, InstantTaskRunner } from "../runners/instant-task-runner";
import { TaskResultStatus, TaskChainResult } from "../task";
import { TaskCancelManager, taskCancelManager } from "../cancel-manager";

export class TaskPlanner {
  constructor(
    private taskScheduler?: TaskScheduler,
    private taskRunner: TaskRunner = new InstantTaskRunner(plannedTasksDB),
    private taskStore: PlannedTasksStore = plannedTasksDB,
    private cancelManager: TaskCancelManager = taskCancelManager
  ) {}

  async plan(
    runnableTask: RunnableTask,
    dispatchableEvent?: DispatchableEvent
  ): Promise<PlannedTask> {
    try {
      checkIfTaskExists(runnableTask.name);

      const plannedTask = await (runnableTask.interval > 0 ||
      runnableTask.startAt !== -1
        ? this.planScheduled(runnableTask, dispatchableEvent)
        : this.planImmediate(runnableTask, dispatchableEvent));

      return plannedTask;
    } catch (err) {
      this.emitTaskChainFinished(dispatchableEvent, err);
      throw err;
    }
  }

  private async planImmediate(
    runnableTask: RunnableTask,
    dispatchableEvent: DispatchableEvent
  ): Promise<PlannedTask> {
    const existedBefore = await this.taskStore.get(runnableTask);
    const plannedTask = await this.taskRunner.run(
      runnableTask,
      dispatchableEvent // FIXME: What happens if dispatchable event is undefined?
    );
    if (!existedBefore) {
      this.cancelManager.add(plannedTask);
    }

    return plannedTask;
  }

  private async planScheduled(
    runnableTask: RunnableTask,
    dispatchableEvent: DispatchableEvent
  ): Promise<PlannedTask> {
    const possibleExisting = await this.taskStore.get(runnableTask);
    if (possibleExisting) {
      this.emitTaskChainFinished(dispatchableEvent);

      return possibleExisting;
    }

    const plannedTask = await this.getTaskScheduler().schedule(runnableTask);
    this.emitTaskChainFinished(dispatchableEvent);
    this.cancelManager.add(plannedTask);

    return plannedTask;
  }

  private emitTaskChainFinished(
    dispatchableEvent?: DispatchableEvent,
    error?: Error
  ) {
    if (!dispatchableEvent) {
      return;
    }
    let result: TaskChainResult = { status: TaskResultStatus.Ok };
    if (error) {
      result = { status: TaskResultStatus.Error, reason: error };
    }
    emit(
      createEvent(TaskDispatcherEvent.TaskChainFinished, {
        id: dispatchableEvent.id,
        data: { result },
      })
    );
  }

  private getTaskScheduler(): TaskScheduler {
    if (!this.taskScheduler) {
      this.taskScheduler = getTaskScheduler();
    }

    return this.taskScheduler;
  }
}
