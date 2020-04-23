import { Observable } from "tns-core-modules/data/observable";
import { Task } from "./internal/tasks/task";
import { TaskGraph } from "./internal/tasks/graph";
import { registerTasks } from "./internal/tasks/provider";
import { taskGraph } from "./internal/tasks/graph/loader";

export abstract class Common extends Observable {
  public message: string;

  constructor() {
    super();
  }

  public init(appTasks: Array<Task>, appTaskGraph: TaskGraph): Promise<void> {
    registerTasks(appTasks);
    return taskGraph.load(appTaskGraph);
  }
}
