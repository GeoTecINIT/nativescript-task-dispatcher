import { Observable } from "tns-core-modules/data/observable";

import { Task } from "./tasks";
import { TaskGraph } from "./tasks/graph";

import { registerTasks } from "./internal/tasks/provider";
import { taskGraph } from "./internal/tasks/graph/loader";

import { LoggerCreator } from "./utils/logger";
import { setLoggerCreator, enableLogging } from "./internal/utils/logger";

export abstract class Common extends Observable {
  constructor() {
    super();
  }

  public init(
    appTasks: Array<Task>,
    appTaskGraph: TaskGraph,
    config: ConfigParams = {}
  ): Promise<void> {
    this.configure(config);
    registerTasks(appTasks);
    return taskGraph.load(appTaskGraph);
  }

  public isReady(): Promise<boolean> {
    return taskGraph.isReady();
  }

  public prepare(): Promise<void> {
    return taskGraph.prepare();
  }

  private configure(config: ConfigParams) {
    if (config.customLogger) {
      setLoggerCreator(config.customLogger);
    }
    if (config.enableLogging || config.customLogger) {
      enableLogging();
    }
  }
}

export interface ConfigParams {
  enableLogging?: boolean;
  customLogger?: LoggerCreator;
}
