import { RunnableTask } from "../../runnable-task";
import { PlannedTask } from "../../planner/planned-task";

export interface TaskScheduler {
  schedule(task: RunnableTask): Promise<PlannedTask>;
  cancel(plannedTaskId: string): Promise<void>;
}

export { taskScheduler } from "./common";
