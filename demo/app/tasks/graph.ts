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
        on("startEvent", run("fastTask"));
        on("startEvent", run("mediumTask"));
        on("startEvent", run("slowTask"));

        on(
            "startEvent",
            run("fastTask", { triggeredBy: "schedule" })
                .every(1, "minutes")
                .cancelOn("stopEvent")
        );
        on(
            "startEvent",
            run("mediumTask").every(2, "minutes").cancelOn("stopEvent")
        );
        on(
            "startEvent",
            run("slowTask").every(4, "minutes").cancelOn("stopEvent")
        );

        on("slowTaskFinished", run("mediumTask"));
        on("slowTaskFinished", run("fastTask"));
        on("mediumTaskFinished", run("fastTask", { triggeredBy: "event" }));
    }
}

export const demoTaskGraph = new DemoTaskGraph();
