import { Common, ConfigParams } from "./task-dispatcher.common";
import { Task } from "./tasks";
import { TaskGraph } from "./tasks/graph";
declare class TaskDispatcher extends Common {
  init(
    appTasks: Array<Task>,
    appTaskGraph: TaskGraph,
    config?: ConfigParams
  ): Promise<void>;
  isReady(): Promise<boolean>;
  prepare(): Promise<void>;
}
export declare const taskDispatcher: TaskDispatcher;
export {};
