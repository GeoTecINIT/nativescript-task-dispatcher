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

export class TaskPlannerParallelizer {
  private readonly triggerData: Map<string, EventRiseData>;

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
      console.log(
        `Parallelizer | Done: EID (${eventId}), LID (${listenerId}), EVT (${JSON.stringify(
          evt
        )})`
      );
      // For some unknown reason event callback has to be unregistered outside the event callback,
      // otherwise an internal error rises on the emitter.
      setTimeout(() => off(TaskDispatcherEvent.TaskChainFinished, listenerId));
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
        TaskChain.finalize(
          parentId,
          didTimedOut ? TaskResultStatus.Cancelled : TaskResultStatus.Ok
        );
      }
    });
    console.log(`Parallelizer | Setup: EID (${eventId}), LID (${listenerId})`);
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
