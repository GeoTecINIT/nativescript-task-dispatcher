import { Common, ConfigParams } from "./task-dispatcher.common";

import { Task } from "./tasks";
import { TaskGraph } from "./tasks/graph";
import { EventData } from "./events";

declare class TaskDispatcher extends Common {
  init(
    appTasks: Array<Task>,
    appTaskGraph: TaskGraph,
    config?: ConfigParams
  ): Promise<void>;
  isReady(): Promise<boolean>;
  prepare(): Promise<void>;
  emitEvent(eventName: string, eventData?: EventData);
}
export declare const taskDispatcher: TaskDispatcher;
export {};
