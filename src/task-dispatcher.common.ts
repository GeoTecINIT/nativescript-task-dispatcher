import { Observable } from "tns-core-modules/data/observable";
import { Task } from "./internal/tasks/task";
import { TaskGraph } from "./internal/tasks/graph";
import { registerTasks } from "./internal/tasks/provider";
import { taskGraph } from "./internal/tasks/graph/loader";
import { enableLogging } from "./internal/utils/logger";

export abstract class Common extends Observable {
  constructor() {
    super();
  }

  public init(appTasks: Array<Task>, appTaskGraph: TaskGraph): Promise<void> {
    enableLogging();
    registerTasks(appTasks);
    return taskGraph.load(appTaskGraph);
  }

  public isReady(): Promise<boolean> {
    return taskGraph.isReady();
  }

  public prepare(): Promise<void> {
    return taskGraph.prepare();
  }
}
