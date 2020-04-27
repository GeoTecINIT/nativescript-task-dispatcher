import {
    TaskGraph,
    EventListenerGenerator,
    RunnableTaskDescriptor,
} from "nativescript-task-dispatcher/tasks/graph";

class DemoTaskGraph implements TaskGraph {
    async describe(
        on: EventListenerGenerator,
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
