import { PlannedTasksStore } from "../../persistence/planned-tasks-store";
import { PlannedTask } from "../planner/planned-task";
import { getTask } from "../provider";
import { Task, TaskParams } from "../task";
import { DispatchableEvent, on, TaskDispatcherEvent, off } from "../../events";
import { Logger, getLogger } from "../../utils/logger";

const FAILURE_THRESHOLD = 3;

export class SingleTaskRunner {
  private logger: Logger;

  constructor(private taskStore: PlannedTasksStore) {
    this.logger = getLogger("SingleTaskRunner");
  }

  async run(
    plannedTask: PlannedTask,
    startEvent: DispatchableEvent
  ): Promise<void> {
    const { name, id, params } = plannedTask;
    const task = getTask(name);

    await this.taskStore.updateLastRun(id, Date.now());

    try {
      const parameterizedTask = new ParameterizedTask(task, params, startEvent);
      await this.runWithTimeout(id, parameterizedTask, startEvent.id);
    } catch (error) {
      await this.taskStore.increaseErrorCount(id);
    }

    if (!plannedTask.recurrent && plannedTask.interval > 0) {
      await this.handleOneShotTask(plannedTask.id);
    }
  }

  private runWithTimeout(
    id: string,
    task: ParameterizedTask,
    startEventId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const listenerId = on(
        TaskDispatcherEvent.TaskExecutionTimedOut,
        (evt) => {
          if (evt.id === startEventId) {
            off(TaskDispatcherEvent.TaskExecutionTimedOut, listenerId);
            task.cancel();
            this.taskStore.increaseTimeoutCount(id).then(() => resolve());
          }
        }
      );

      let taskAlreadyRun = false;
      let taskChainFinished = false;
      this.waitForTaskChainToFinish(startEventId).then(() => {
        taskChainFinished = true;
        if (taskAlreadyRun) {
          resolve();
        }
      });

      task
        .run()
        .then(() => {
          taskAlreadyRun = true;
          off(TaskDispatcherEvent.TaskExecutionTimedOut, listenerId);
          if (taskChainFinished) {
            resolve();
          }
        })
        .catch((err) => {
          off(TaskDispatcherEvent.TaskExecutionTimedOut, listenerId);
          reject(err);
        });
    });
  }

  private waitForTaskChainToFinish(startEventId: string): Promise<void> {
    return new Promise((resolve) => {
      const listenerId = on(
        TaskDispatcherEvent.TaskChainFinished,
        (chainFinishedEvt) => {
          if (chainFinishedEvt.id === startEventId) {
            off(TaskDispatcherEvent.TaskChainFinished, listenerId);
            resolve();
          }
        }
      );
    });
  }

  private async handleOneShotTask(id: string): Promise<void> {
    const { errorCount, timeoutCount } = await this.taskStore.get(id);

    if (errorCount === 0 && timeoutCount === 0) {
      await this.taskStore.delete(id);
    } else if (
      errorCount > FAILURE_THRESHOLD ||
      timeoutCount > FAILURE_THRESHOLD
    ) {
      this.logger.warn(
        `One-shot planned task id:${id} discarded after {errorCount:${errorCount}, timeoutCount:${timeoutCount}}`
      );
      await this.taskStore.delete(id);
    }
  }
}

// tslint:disable-next-line:max-classes-per-file
class ParameterizedTask {
  constructor(
    private task: Task,
    private taskParams: TaskParams,
    private startEvent: DispatchableEvent
  ) {}

  run(): Promise<void> {
    return this.task.run(this.taskParams, this.startEvent);
  }

  cancel() {
    this.task.cancel();
  }
}
