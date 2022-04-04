import { Task } from "nativescript-task-dispatcher/internal/tasks/task";
import { TaskGraphBrowser } from "nativescript-task-dispatcher/internal/tasks/graph/browser";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import { RunnableTaskBuilderImpl } from "nativescript-task-dispatcher/internal/tasks/runnable-task/builder";
import { GraphEntry } from "nativescript-task-dispatcher/internal/tasks/graph/browser";
import { testTasks } from "../index";

describe("Task graph browser", () => {
    let taskProvider: (taskName: string) => Task;
    let browser: TaskGraphBrowser;

    beforeEach(() => {
        const searchFunction = (taskName) =>
            testTasks.find((task) => task.name === taskName);
        taskProvider = jasmine
            .createSpy("taskProvider", searchFunction)
            .and.callThrough();
        browser = new TaskGraphBrowser(taskProvider);
    });

    const entries: Array<BrowserEntry> = [
        {
            launchEvent: "startEvent",
            runnableTask: new RunnableTaskBuilderImpl("emitterTask", {})
                .now()
                .build(),
        },
        {
            launchEvent: "startEvent",
            runnableTask: new RunnableTaskBuilderImpl("emitterTask", {})
                .every(1, "minutes")
                .cancelOn("stopEvent")
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
            launchEvent: "patataCooked",
            runnableTask: new RunnableTaskBuilderImpl("patataSlicer", {})
                .now()
                .build(),
        },
        {
            launchEvent: "patataSliced",
            runnableTask: new RunnableTaskBuilderImpl("dummyForegroundTask", {})
                .now()
                .build(),
        },
        {
            launchEvent: "pingEmitted",
            runnableTask: new RunnableTaskBuilderImpl("pongTask", {})
                .now()
                .build(),
        },
    ];

    const expectedPath: Array<GraphEntry> = [
        {
            trigger: "startEvent",
            tasks: [
                {
                    ...entries[0].runnableTask,
                    outputs: [
                        {
                            trigger: "patataCooked",
                            tasks: [
                                {
                                    ...entries[3].runnableTask,
                                    outputs: [
                                        {
                                            trigger: "patataSliced",
                                            tasks: [
                                                {
                                                    ...entries[4].runnableTask,
                                                    outputs: [
                                                        {
                                                            trigger:
                                                                "dummyForegroundTaskFinished",
                                                            tasks: [],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    ...entries[1].runnableTask,
                    outputs: [
                        {
                            trigger: "patataCooked",
                            tasks: [
                                {
                                    ...entries[3].runnableTask,
                                    outputs: [
                                        {
                                            trigger: "patataSliced",
                                            tasks: [
                                                {
                                                    ...entries[4].runnableTask,
                                                    outputs: [
                                                        {
                                                            trigger:
                                                                "dummyForegroundTaskFinished",
                                                            tasks: [],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    ...entries[2].runnableTask,
                    outputs: [
                        {
                            trigger: "dummyTaskFinished",
                            tasks: [],
                        },
                    ],
                },
            ],
        },
        {
            trigger: "pingEmitted",
            tasks: [
                {
                    ...entries[5].runnableTask,
                    outputs: [
                        {
                            trigger: "pingReceived",
                            tasks: [],
                        },
                    ],
                },
            ],
        },
    ];

    it("allows to add an entry to the task graph representation", () => {
        const { launchEvent, runnableTask } = entries[0];
        browser.addEntry(launchEvent, runnableTask);
    });

    it("allows to get the tasks triggered by a given event name", () => {
        for (let entry of entries) {
            browser.addEntry(entry.launchEvent, entry.runnableTask);
        }
        const tasks = browser.getTriggeredBy("startEvent");
        expect(tasks.length).toBe(3);
        expect(tasks[0]).toBe(entries[0].runnableTask);
        expect(tasks[1]).toBe(entries[1].runnableTask);
        expect(tasks[2]).toBe(entries[2].runnableTask);
    });

    it("returns no task when the given event name triggers none", () => {
        for (let entry of entries) {
            browser.addEntry(entry.launchEvent, entry.runnableTask);
        }
        const tasks = browser.getTriggeredBy("stopEvent");
        expect(tasks.length).toBe(0);
    });

    it("allows to obtain a unique set of tasks that will run at some moment, even with different configs", () => {
        for (let entry of entries) {
            browser.addEntry(entry.launchEvent, entry.runnableTask);
        }
        const tasks = browser.getUniques();
        expect(tasks.length).toBe(6);
        expect(tasks).toEqual(entries.map((entry) => entry.runnableTask));
    });

    it("allows to check if any added entry matches a certain criteria", () => {
        for (let entry of entries) {
            browser.addEntry(entry.launchEvent, entry.runnableTask);
        }
        const matches = browser.any(
            (runnableTask) =>
                runnableTask.interval !== 0 && runnableTask.interval <= 15 * 60
        );
        expect(matches).toBeTrue();
        expect(taskProvider).toHaveBeenCalledTimes(2);
    });

    it("allows to walk the graph from an event to evaluate a condition to be met by the tasks depending on it", () => {
        for (let entry of entries) {
            browser.addEntry(entry.launchEvent, entry.runnableTask);
        }
        const matches = browser.anyFrom(
            "startEvent",
            (task) => !task.instance.runsInBackground()
        );
        expect(matches).toBeTrue();
        expect(taskProvider).toHaveBeenCalledTimes(3);
    });

    it("allows to depict the given task entries in a structured way", () => {
        for (let entry of entries) {
            browser.addEntry(entry.launchEvent, entry.runnableTask);
        }
        const graphPath = browser.depict();
        expect(graphPath).toEqual(expectedPath);
        expect(taskProvider).toHaveBeenCalledTimes(12);
    });

    it("allows to walk the task graph from a given event name", () => {
        for (let entry of entries) {
            browser.addEntry(entry.launchEvent, entry.runnableTask);
        }
        const graphPath = browser.walkFrom("startEvent");
        expect(graphPath).toEqual(expectedPath[0].tasks);
        expect(taskProvider).toHaveBeenCalledTimes(5);
    });

    it("returns an empty task list when the given event is unknown", () => {
        const graphPath = browser.walkFrom("stopEvent");
        expect(graphPath.length).toBe(0);
        expect(taskProvider).not.toHaveBeenCalled();
    });
});

interface BrowserEntry {
    launchEvent: string;
    runnableTask: RunnableTask;
}
