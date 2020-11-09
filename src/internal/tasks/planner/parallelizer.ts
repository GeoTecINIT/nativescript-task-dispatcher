import { TaskGraphBrowser } from "../graph/browser";
import {
  createEvent,
  DispatchableEvent,
  emit,
  off,
  on,
  TaskDispatcherEvent,
} from "../../events";
import { TaskChain, TaskResultStatus } from "../task-chain";
import { getLogger, Logger } from "../../utils/logger";

export class TaskPlannerParallelizer {
  private readonly triggerData: Map<string, EventRiseData>;
  private logger: Logger;

  constructor(private graphBrowser: TaskGraphBrowser) {
    this.triggerData = new Map<string, EventRiseData>();
  }

  spawnChildEvent(parent: DispatchableEvent): DispatchableEvent {
    const siblingTasks = this.graphBrowser.getTriggeredBy(parent.name);
    if (siblingTasks.length < 2) {
      return parent;
    }

    const triggerId = `${parent.name}#${parent.id}`;
    if (!this.triggerData.has(triggerId)) {
      const timeoutId = this.setupTimeoutPropagation(triggerId);
      this.triggerData.set(
        triggerId,
        createEventRiseData(siblingTasks.length, timeoutId)
      );
    }

    const childEvent = createEvent(parent.name, {
      data: parent.data,
      expirationTimestamp: parent.expirationTimestamp,
    });

    const childTasks = this.triggerData.get(triggerId).childTasks;
    childTasks.eventIds.add(childEvent.id);

    this.setupTaskFinalizationSink(childEvent.id, triggerId);
    this.getLogger().info(
      `Child event (name=${childEvent.name}, id=${childEvent.id}) spawned (invocationId=${parent.id})`
    );
    return childEvent;
  }

  private setupTimeoutPropagation(triggerId: string): number {
    const timeoutId = on(TaskDispatcherEvent.TaskExecutionTimedOut, (evt) => {
      const [, eventId] = triggerId.split("#");
      if (evt.id !== eventId) {
        return;
      }

      off(TaskDispatcherEvent.TaskExecutionTimedOut, timeoutId);
      if (!this.triggerData.has(triggerId)) {
        return;
      }

      const triggerData = this.triggerData.get(triggerId);
      triggerData.didTimedOut = true;

      const childTasks = triggerData.childTasks;
      for (let childEventId of childTasks.eventIds) {
        const timeoutEvent = createEvent(
          TaskDispatcherEvent.TaskExecutionTimedOut,
          { id: childEventId }
        );
        emit(timeoutEvent);
      }
    });
    return timeoutId;
  }

  private setupTaskFinalizationSink(eventId: string, triggerId: string): void {
    const listenerId = on(TaskDispatcherEvent.TaskChainFinished, (evt) => {
      if (evt.id !== eventId) {
        return;
      }

      // For some unknown reason event callback has to be unregistered outside itself,
      // otherwise an internal error rises on the emitter. Moreover, last callback gets called twice
      // although event is only emitted once (seems a SDK bug).
      off(TaskDispatcherEvent.TaskChainFinished, listenerId);

      if (!this.triggerData.has(triggerId)) {
        return;
      }

      const triggerData = this.triggerData.get(triggerId);
      const childTasks = triggerData.childTasks;
      childTasks.eventIds.delete(eventId);
      childTasks.count--;

      if (childTasks.count === 0) {
        const [, parentId] = triggerId.split("#");
        const { didTimedOut } = triggerData;
        if (!didTimedOut) {
          off(TaskDispatcherEvent.TaskExecutionTimedOut, triggerData.timeoutId);
        }
        this.triggerData.delete(triggerId);
        TaskChain.finalize(
          parentId,
          didTimedOut ? TaskResultStatus.Cancelled : TaskResultStatus.Ok
        );
      }
    });
  }

  private getLogger(): Logger {
    if (!this.logger) {
      this.logger = getLogger("TaskPlannerParallelizer");
    }
    return this.logger;
  }
}

function createEventRiseData(
  taskCount: number,
  timeoutId: number
): EventRiseData {
  return {
    childTasks: {
      count: taskCount,
      eventIds: new Set<string>(),
    },
    didTimedOut: false,
    timeoutId,
  };
}

interface EventRiseData {
  childTasks: {
    count: number;
    eventIds: Set<string>;
  };
  didTimedOut: boolean;
  timeoutId: number;
}
