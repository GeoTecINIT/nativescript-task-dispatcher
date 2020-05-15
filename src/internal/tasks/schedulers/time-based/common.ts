import { RunnableTask } from "../../runnable-task";
import { PlannedTask } from "../../planner/planned-task";

export interface TaskScheduler {
  schedule(task: RunnableTask): Promise<PlannedTask>;
  cancel(plannedTaskId: string): Promise<void>;
}

let _taskSchedulerCreator: () => TaskScheduler = () => null;

export function setTaskSchedulerCreator(creator: () => TaskScheduler) {
  _taskSchedulerCreator = creator;
}

export function taskScheduler() {
  return _taskSchedulerCreator();
}
