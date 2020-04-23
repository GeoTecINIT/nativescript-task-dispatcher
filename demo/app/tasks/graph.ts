import {
    TaskGraph,
    TaskEventBinder,
    RunnableTaskDescriptor,
} from "nativescript-task-dispatcher/internal/tasks/graph";

class DemoTaskGraph implements TaskGraph {
    async describe(
        on: TaskEventBinder,
        run: RunnableTaskDescriptor
    ): Promise<void> {
        on(
            "startEvent",
            run("fastTask").every(1, "minutes").cancelOn("stopEvent")
        );
        on(
            "startEvent",
            run("mediumTask").every(2, "minutes").cancelOn("stopEvent")
        );
        on(
            "startEvent",
            run("slowTask").every(4, "minutes").cancelOn("stopEvent")
        );

        on("slowTaskFinished", run("mediumTask").now());
        on("mediumTaskFinished", run("fastTask").now());
    }
}

export const demoTaskGraph = new DemoTaskGraph();
