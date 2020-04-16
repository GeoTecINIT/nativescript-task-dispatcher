import { TaskScheduler } from ".";

let _taskScheduler: TaskScheduler = null;

export function setTaskScheduler(scheduler: TaskScheduler) {
  _taskScheduler = scheduler;
}

export function taskScheduler() {
  return _taskScheduler;
}
