import { Common } from "./task-dispatcher.common";
import { Task } from "./internal/tasks/task";
import { TaskGraph } from "./internal/tasks/graph";
declare class TaskDispatcher extends Common {
  init(appTasks: Array<Task>, appTaskGraph: TaskGraph): Promise<void>;
  isReady(): Promise<boolean>;
  prepare(): Promise<void>;
}
export declare const taskDispatcher: TaskDispatcher;
export {};
