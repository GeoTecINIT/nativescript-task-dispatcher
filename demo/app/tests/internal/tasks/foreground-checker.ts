import {
    setTasks,
    getTask,
} from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from "./index";

import { TaskGraphBrowser } from "nativescript-task-dispatcher/internal/tasks/graph/browser";
import { ForegroundChecker } from "nativescript-task-dispatcher/internal/tasks/foreground-checker";

import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import { RunnableTaskBuilderImpl } from "nativescript-task-dispatcher/internal/tasks/runnable-task/builder";

describe("Foreground checker", () => {
    setTasks(testTasks);

    let graphBrowser: TaskGraphBrowser;
    let checker: ForegroundChecker;

    const entries = createFakeEntryList();

    beforeEach(() => {
        graphBrowser = new TaskGraphBrowser(getTask);
        checker = new ForegroundChecker(getTask, graphBrowser);
        for (let { launchEvent, runnableTask } of entries) {
            graphBrowser.addEntry(launchEvent, runnableTask);
        }
    });

    it("returns true when a task itself has to be run in foreground", () => {
        const requiresForeground = checker.requiresForegroundThroughChain(
            "dummyForegroundTask"
        );
        expect(requiresForeground).toBeTrue();
    });

    it("returns true when a task does not require to be run in foreground but the ones that depend on it do", () => {
        const requiresForeground = checker.requiresForegroundThroughChain(
            "dummyTask"
        );
        expect(requiresForeground).toBeTrue();
    });

    it("returns false when a task does not require to be run in foreground neither the ones that depend on it", () => {
        const requiresForeground = checker.requiresForegroundThroughChain(
            "emitterTask"
        );
        expect(requiresForeground).toBeFalse();
    });

    it("returns false when a task does not require to be run in foreground and no other task depends on it", () => {
        const requiresForeground = checker.requiresForegroundThroughChain(
            "patataSlicer"
        );
        expect(requiresForeground).toBeFalse();
    });
});

function createFakeEntryList(): Array<BrowserEntry> {
    return [
        {
            launchEvent: "startEvent",
            runnableTask: new RunnableTaskBuilderImpl("emitterTask", {})
                .now()
                .build(),
        },
        {
            launchEvent: "patataCooked",
            runnableTask: new RunnableTaskBuilderImpl("patataSlicer", {})
                .now()
                .build(),
        },
        {
            launchEvent: "startEvent",
            runnableTask: new RunnableTaskBuilderImpl("dummyTask", {})
                .every(1, "minutes")
                .cancelOn("stopEvent")
                .build(),
        },
        {
            launchEvent: "dummyTaskFinished",
            runnableTask: new RunnableTaskBuilderImpl("dummyForegroundTask", {})
                .now()
                .build(),
        },
    ];
}

interface BrowserEntry {
    launchEvent: string;
    runnableTask: RunnableTask;
}
