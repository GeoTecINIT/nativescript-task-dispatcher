import { Task } from "./task";
import { getTask } from "./provider";
import { taskGraphBrowser, TaskGraphBrowser } from "./graph/browser";

type TaskProvider = (taskName: string) => Task;

export class ForegroundChecker {
  constructor(
    private taskProvider: TaskProvider = getTask,
    private graphBrowser: TaskGraphBrowser = taskGraphBrowser
  ) {}

  requiresForegroundThroughChain(taskName: string): boolean {
    const task = this.taskProvider(taskName);
    if (!task.runsInBackground()) {
      return true;
    }
    for (let outputEvent of task.outputEventNames) {
      const requiresForeground = this.graphBrowser.anyFrom(
        outputEvent,
        (childTask) => !childTask.instance.runsInBackground()
      );
      if (requiresForeground) {
        return true;
      }
    }
    return false;
  }
}
