import { RunnableTask } from "../runnable-task";
import { Task } from "../task";
import { getTask } from "../provider";

type TaskProvider = (taskName: string) => Task;

export class TaskGraphBrowser {
  private readonly entries: Map<string, Array<RunnableTask>>;

  constructor(private taskProvider: TaskProvider = getTask) {
    this.entries = new Map<string, Array<RunnableTask>>();
  }

  addEntry(invocationEvent: string, runnableTask: RunnableTask) {
    if (!this.entries.has(invocationEvent)) {
      this.entries.set(invocationEvent, []);
    }
    this.entries.get(invocationEvent).push(runnableTask);
  }

  getTriggeredBy(invocationEvent: string): Array<RunnableTask> {
    if (!this.entries.has(invocationEvent)) {
      return [];
    }
    return this.entries.get(invocationEvent);
  }

  getUniques(): Array<RunnableTask> {
    const uniques = new Set<RunnableTask>();
    for (let runnableTasks of this.entries.values()) {
      for (let runnableTask of runnableTasks) {
        uniques.add(runnableTask);
      }
    }
    return [...uniques];
  }

  any(matcher: QueryMatcher): boolean {
    for (let runnableTask of this.getUniques()) {
      const instance = this.taskProvider(runnableTask.name);
      const matches = matcher({ ...runnableTask, instance });
      if (matches) {
        return true;
      }
    }
    return false;
  }

  anyFrom(eventName: string, matcher: QueryMatcher): boolean {
    const memory = new Map<string, boolean>();
    try {
      return this.memoizedAnyFrom(eventName, matcher, memory);
    } catch (err) {
      if (err instanceof RangeError) {
        throw new Error("Task graphs with cycles are not supported");
      } else {
        throw err;
      }
    }
  }

  depict(): Array<GraphEntry> {
    const rootEvents = this.getRootEvents();
    return rootEvents.map((eventName) => ({
      trigger: eventName,
      tasks: this.walkFrom(eventName),
    }));
  }

  walkFrom(eventName: string): Array<GraphTask> {
    const memory = new Map<string, Array<GraphTask>>();
    try {
      return this.memoizedWalk(eventName, memory);
    } catch (err) {
      if (err instanceof RangeError) {
        throw new Error("Task graphs with cycles are not supported");
      } else {
        throw err;
      }
    }
  }

  private getRootEvents(): Array<string> {
    const rootEvents = new Set(this.entries.keys());
    for (let runnableTasks of this.entries.values()) {
      for (let runnableTask of runnableTasks) {
        const task = this.taskProvider(runnableTask.name);
        for (let outputEvent of task.outputEventNames) {
          if (rootEvents.has(outputEvent)) {
            rootEvents.delete(outputEvent);
          }
        }
      }
    }
    return [...rootEvents];
  }

  private memoizedAnyFrom(
    eventName: string,
    matcher: QueryMatcher,
    memory: Map<string, boolean>
  ): boolean {
    if (!this.entries.has(eventName)) {
      return false;
    }
    if (memory.has(eventName)) {
      return memory.get(eventName);
    }

    const runnableTasks = this.entries.get(eventName);
    for (let runnableTask of runnableTasks) {
      const instance = this.taskProvider(runnableTask.name);
      const matches = matcher({ ...runnableTask, instance });
      if (matches) {
        return true;
      }
      for (let outputEvent of instance.outputEventNames) {
        const childMatches = this.memoizedAnyFrom(outputEvent, matcher, memory);
        if (childMatches) {
          return true;
        }
      }
    }
    return false;
  }

  private memoizedWalk(
    eventName: string,
    memory: Map<string, Array<GraphTask>>
  ): Array<GraphTask> {
    if (!this.entries.has(eventName)) {
      return [];
    }
    if (memory.has(eventName)) {
      return memory.get(eventName);
    }

    const runnableTasks = this.entries.get(eventName);
    const eventTriggeredTasks = runnableTasks.map((runnableTask) => ({
      ...runnableTask,
      outputs: this.walkOutputs(runnableTask, memory),
    }));

    memory.set(eventName, eventTriggeredTasks);
    return eventTriggeredTasks;
  }

  private walkOutputs(
    runnableTask: RunnableTask,
    memory: Map<string, Array<GraphTask>>
  ): Array<GraphEntry> {
    const task = this.taskProvider(runnableTask.name);
    return task.outputEventNames.map((outputEvent) => ({
      trigger: outputEvent,
      tasks: this.memoizedWalk(outputEvent, memory),
    }));
  }
}

export const taskGraphBrowser = new TaskGraphBrowser();

type QueryMatcher = (runnableTask: LinkedRunnableTask) => boolean;

export interface GraphEntry {
  trigger: string;
  tasks: Array<GraphTask>;
}

export interface GraphTask extends RunnableTask {
  outputs: Array<GraphEntry>;
}

export interface LinkedRunnableTask extends RunnableTask {
  instance: Task;
}
