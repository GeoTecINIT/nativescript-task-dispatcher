import {
  TaskScheduler,
  taskScheduler as getTaskScheduler,
} from "../schedulers/time-based";
import {
  InstantTaskRunner,
  TaskRunner,
} from "../schedulers/immediate/instant-task-runner";
import {
  plannedTasksDB,
  PlannedTasksStore,
} from "../../persistence/planned-tasks-store";
import { TaskCancelManager, taskCancelManager } from "../cancel-manager";
import { taskGraphBrowser } from "../graph/browser";

import { RunnableTask } from "../runnable-task";
import { DispatchableEvent } from "../../events";

import { PlannedTask } from "./planned-task";
import { checkIfTaskExists } from "../provider";
import { TaskChain, TaskResultStatus } from "../task-chain";
import { TaskPlannerParallelizer } from "./parallelizer";

export class TaskPlanner {
  constructor(
    private taskScheduler?: TaskScheduler,
    private taskRunner: TaskRunner = new InstantTaskRunner(plannedTasksDB),
    private taskStore: PlannedTasksStore = plannedTasksDB,
    private cancelManager: TaskCancelManager = taskCancelManager,
    private parallelizer: TaskPlannerParallelizer = new TaskPlannerParallelizer(
      taskGraphBrowser
    )
  ) {}

  async plan(
    runnableTask: RunnableTask,
    dispatchableEvent: DispatchableEvent
  ): Promise<PlannedTask> {
    const invocationEvent = this.parallelizer.spawnChildEvent(
      dispatchableEvent
    );
    try {
      checkIfTaskExists(runnableTask.name);

      return await (runnableTask.interval > 0 || runnableTask.startAt !== -1
        ? this.planScheduled(runnableTask, invocationEvent)
        : this.planImmediate(runnableTask, invocationEvent));
    } catch (err) {
      emitTaskChainFinished(invocationEvent, err);
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
      emitTaskChainFinished(dispatchableEvent);

      return possibleExisting;
    }

    const plannedTask = await this.getTaskScheduler().schedule(runnableTask);
    emitTaskChainFinished(dispatchableEvent);
    this.cancelManager.add(plannedTask);

    return plannedTask;
  }

  private getTaskScheduler(): TaskScheduler {
    if (!this.taskScheduler) {
      this.taskScheduler = getTaskScheduler();
    }

    return this.taskScheduler;
  }
}

function emitTaskChainFinished(
  dispatchableEvent?: DispatchableEvent,
  error?: Error
) {
  if (!dispatchableEvent) {
    return;
  }

  const status = error ? TaskResultStatus.Error : TaskResultStatus.Ok;
  TaskChain.finalize(dispatchableEvent.id, status, error);
}
