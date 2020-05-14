import { TaskScheduler } from ".";

let _taskSchedulerCreator: () => TaskScheduler = () => null;

export function setTaskSchedulerCreator(creator: () => TaskScheduler) {
  _taskSchedulerCreator = creator;
}

export function taskScheduler() {
  return _taskSchedulerCreator();
}
