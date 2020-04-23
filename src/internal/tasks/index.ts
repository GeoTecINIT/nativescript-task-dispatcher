import { TaskParams, setTaskDeferrer } from "./task";

import { TaskPlanner } from "./planner";
import { RunnableTaskBuilder } from "./runnable-task/builder";

const taskPlanner = new TaskPlanner();
export function run(taskName: string, params: TaskParams = {}) {
  return new RunnableTaskBuilder(taskName, params, taskPlanner);
}

setTaskDeferrer((taskName, seconds, params) =>
  run(taskName, params).in(seconds).plan()
);
