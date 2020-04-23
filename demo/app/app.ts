import * as app from "tns-core-modules/application";
import { taskDispatcher } from "nativescript-task-dispatcher";
import { appTasks } from "./tasks";
import { demoTaskGraph } from "./tasks/graph";

taskDispatcher.init(appTasks, demoTaskGraph);

app.run({ moduleName: "app-root" });

/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
