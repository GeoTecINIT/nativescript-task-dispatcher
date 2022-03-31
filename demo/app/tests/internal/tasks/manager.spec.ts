import { setTasks } from "nativescript-task-dispatcher/internal/tasks/provider";
import { testTasks } from ".";
import {
    PlanningType,
    PlannedTask,
    SchedulerType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";
import { createPlannedTaskStoreMock } from "../persistence";
import { ForegroundChecker } from "nativescript-task-dispatcher/internal/tasks/foreground-checker";
import { TaskManager } from "nativescript-task-dispatcher/internal/tasks/manager";
import { uuid } from "nativescript-task-dispatcher/internal/utils/uuid";
import { now } from "nativescript-task-dispatcher/internal/utils/time";

describe("Task manager", () => {
    setTasks(testTasks);

    const offset = 30000; // The half of alarm scheduler's fastest triggering frequency
    const plannedTasksStore = createPlannedTaskStoreMock();
    const foregroundChecker = createForegroundCheckerMock();
    let taskPlanner: TaskManager;

    const stdInterval = 60000;
    const currentTime = now();

    // To be run in 30s
    const ephemeralTaskToBeRun = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: stdInterval,
            recurrent: false,
            params: {},
        },
        uuid(),
        currentTime - stdInterval + offset
    );

    // To be run in 90s
    const ephemeralTaskNotToBeRun = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 2 * stdInterval,
            recurrent: false,
            params: {},
        },
        uuid(),
        currentTime - stdInterval + offset
    );

    // To be run in 30s
    const recurrentTaskToBeRun = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyForegroundTask",
            startAt: -1,
            interval: stdInterval + offset,
            recurrent: true,
            params: {},
        },
        uuid(),
        currentTime - 2 * stdInterval + offset,
        currentTime - stdInterval
    );

    // To be run in 60s
    const recurrentTaskNotToBeRun = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 2 * stdInterval,
            recurrent: true,
            params: {},
        },
        uuid(),
        currentTime - 4 * stdInterval,
        currentTime - stdInterval
    );

    // To be run in 30s
    const delayedTaskToBeRun = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: currentTime + offset,
            interval: 2 * stdInterval,
            recurrent: true,
            params: {},
        },
        uuid(),
        currentTime - stdInterval
    );

    // To be run in 90s
    const delayedTaskNotToBeRun = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: currentTime + stdInterval + offset,
            interval: 0,
            recurrent: false,
            params: {},
        },
        uuid(),
        currentTime - 2 * stdInterval
    );

    const sortedTasks = [
        ephemeralTaskToBeRun,
        recurrentTaskToBeRun,
        delayedTaskToBeRun,
        recurrentTaskNotToBeRun,
        ephemeralTaskNotToBeRun,
        delayedTaskNotToBeRun,
    ];

    beforeEach(() => {
        taskPlanner = new TaskManager(
            PlanningType.Scheduled,
            plannedTasksStore,
            foregroundChecker,
            offset,
            currentTime
        );
        spyOn(foregroundChecker, "requiresForegroundThroughChain").and.callFake(
            (taskName) => taskName === "dummyForegroundTask"
        );
    });

    it("lists the tasks to be run for a given type", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(Promise.resolve(sortedTasks));
        const tasks = await taskPlanner.tasksToRun();
        expect(tasks).toEqual([
            ephemeralTaskToBeRun,
            recurrentTaskToBeRun,
            delayedTaskToBeRun,
        ]);
    });

    it("returns an empty list when no tasks need to be run", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(
                Promise.resolve([
                    ephemeralTaskNotToBeRun,
                    recurrentTaskNotToBeRun,
                    delayedTaskNotToBeRun,
                ])
            );
        const tasks = await taskPlanner.tasksToRun();
        expect(tasks.length).toBe(0);
    });

    it("checks if at least a task to be run requires foreground execution", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(Promise.resolve(sortedTasks));
        const requiresForeground = await taskPlanner.requiresForeground();
        expect(requiresForeground).toBeTruthy();
    });

    it("returns false when no tasks need to be run in the foreground", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(
                Promise.resolve([
                    ephemeralTaskToBeRun,
                    ephemeralTaskNotToBeRun,
                    recurrentTaskNotToBeRun,
                ])
            );
        const requiresForeground = await taskPlanner.requiresForeground();
        expect(requiresForeground).toBeFalsy();
    });

    it("determines if there are tasks that will require another run", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(Promise.resolve(sortedTasks));
        const willContinue = await taskPlanner.willContinue();
        expect(willContinue).toBeTruthy();
    });

    it("returns false when no tasks need to be run", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(Promise.resolve([]));
        const willContinue = await taskPlanner.willContinue();
        expect(willContinue).toBeFalsy();
    });

    it("returns false when all the tasks are finite and fit in this execution window", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(Promise.resolve([ephemeralTaskToBeRun]));
        const willContinue = await taskPlanner.willContinue();
        expect(willContinue).toBeFalsy();
    });

    it("returns true when all the tasks are finite but do not fit in this execution window", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(
                Promise.resolve([ephemeralTaskToBeRun, ephemeralTaskNotToBeRun])
            );
        const willContinue = await taskPlanner.willContinue();
        expect(willContinue).toBeTruthy();
    });

    it("calculates the time until the next execution of the planner", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(Promise.resolve(sortedTasks));
        const nextInterval = await taskPlanner.nextInterval();
        expect(nextInterval).toBe(offset);
    });

    it("returns -1 when a next execution is not required", async () => {
        spyOn(plannedTasksStore, "getAllSortedByNextRun")
            .withArgs(PlanningType.Scheduled)
            .and.returnValue(Promise.resolve([ephemeralTaskToBeRun]));
        const nextInterval = await taskPlanner.nextInterval();
        expect(nextInterval).toBe(-1);
    });
});

describe("Tasks manager next interval", () => {
    const minute = 60000;
    const initialTime = now();
    const plannedTasksStore = createPlannedTaskStoreMock();
    const foregroundChecker = createForegroundCheckerMock();
    let taskPlanner: TaskManager;

    const task1Minutes = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: minute,
            recurrent: true,
            params: {},
        },
        uuid(),
        initialTime
    );
    const task2Minutes = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 2 * minute,
            recurrent: true,
            params: {},
        },
        uuid(),
        initialTime
    );
    const task3Minutes = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 3 * minute,
            recurrent: true,
            params: {},
        },
        uuid(),
        initialTime
    );
    const task5Minutes = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 5 * minute,
            recurrent: true,
            params: {},
        },
        uuid(),
        initialTime
    );

    const testCases = [
        {
            firstMinutes: 2,
            firstExecution: "first",
            case: "2-3-5",
            tasks: [
                { task: task2Minutes, lastRun: -1 },
                { task: task3Minutes, lastRun: -1 },
                { task: task5Minutes, lastRun: -1 },
            ],
            currentMinute: 2,
            expectedResult: 1,
        },
        {
            firstMinutes: 3,
            firstExecution: "first",
            case: "2-3-5",
            tasks: [
                { task: task2Minutes, lastRun: initialTime + 2 * minute },
                { task: task3Minutes, lastRun: -1 },
                { task: task5Minutes, lastRun: -1 },
            ],
            currentMinute: 3,
            expectedResult: 1,
        },
        {
            firstMinutes: 2,
            firstExecution: "second",
            secondMinutes: 3,
            secondExecution: "first",
            case: "2-3-5",
            tasks: [
                { task: task2Minutes, lastRun: initialTime + 2 * minute },
                { task: task3Minutes, lastRun: initialTime + 3 * minute },
                { task: task5Minutes, lastRun: -1 },
            ],
            currentMinute: 4,
            expectedResult: 1,
        },
        {
            firstMinutes: 5,
            firstExecution: "first",
            case: "2-3-5",
            tasks: [
                { task: task2Minutes, lastRun: initialTime + 4 * minute },
                { task: task3Minutes, lastRun: initialTime + 3 * minute },
                { task: task5Minutes, lastRun: -1 },
            ],
            currentMinute: 5,
            expectedResult: 1,
        },
        {
            firstMinutes: 2,
            firstExecution: "third",
            secondMinutes: 3,
            secondExecution: "second",
            case: "2-3-5",
            tasks: [
                { task: task2Minutes, lastRun: initialTime + 4 * minute },
                { task: task3Minutes, lastRun: initialTime + 3 * minute },
                { task: task5Minutes, lastRun: initialTime + 5 * minute },
            ],
            currentMinute: 6,
            expectedResult: 2,
        },
        {
            firstMinutes: 2,
            firstExecution: "fourth",
            case: "2-3-5",
            tasks: [
                { task: task2Minutes, lastRun: initialTime + 6 * minute },
                { task: task3Minutes, lastRun: initialTime + 6 * minute },
                { task: task5Minutes, lastRun: initialTime + 5 * minute },
            ],
            currentMinute: 8,
            expectedResult: 1,
        },
        {
            firstMinutes: 3,
            firstExecution: "first",
            case: "3-5",
            tasks: [
                { task: task3Minutes, lastRun: -1 },
                { task: task5Minutes, lastRun: -1 },
            ],
            currentMinute: 3,
            expectedResult: 2,
        },
        {
            firstMinutes: 5,
            firstExecution: "first",
            case: "3-5",
            tasks: [
                { task: task3Minutes, lastRun: initialTime + 3 * minute },
                { task: task5Minutes, lastRun: -1 },
            ],
            currentMinute: 5,
            expectedResult: 1,
        },
        {
            firstMinutes: 3,
            firstExecution: "second",
            case: "3-5",
            tasks: [
                { task: task3Minutes, lastRun: initialTime + 3 * minute },
                { task: task5Minutes, lastRun: initialTime + 5 * minute },
            ],
            currentMinute: 6,
            expectedResult: 3,
        },
        {
            firstMinutes: 3,
            firstExecution: "third",
            case: "3-5",
            tasks: [
                { task: task3Minutes, lastRun: initialTime + 6 * minute },
                { task: task5Minutes, lastRun: initialTime + 5 * minute },
            ],
            currentMinute: 9,
            expectedResult: 1,
        },
        {
            firstMinutes: 5,
            firstExecution: "second",
            case: "3-5",
            tasks: [
                { task: task3Minutes, lastRun: initialTime + 9 * minute },
                { task: task5Minutes, lastRun: initialTime + 5 * minute },
            ],
            currentMinute: 10,
            expectedResult: 2,
        },
        {
            firstMinutes: 3,
            firstExecution: "fourth",
            case: "3-5",
            tasks: [
                { task: task3Minutes, lastRun: initialTime + 9 * minute },
                { task: task5Minutes, lastRun: initialTime + 10 * minute },
            ],
            currentMinute: 12,
            expectedResult: 3,
        },
        {
            firstMinutes: 3,
            firstExecution: "fifth",
            secondMinutes: 5,
            secondExecution: "third",
            case: "3-5",
            tasks: [
                { task: task3Minutes, lastRun: initialTime + 12 * minute },
                { task: task5Minutes, lastRun: initialTime + 10 * minute },
            ],
            currentMinute: 15,
            expectedResult: 3,
        },
        {
            firstMinutes: 1,
            firstExecution: "first",
            case: "1-2",
            tasks: [
                { task: task1Minutes, lastRun: -1 },
                { task: task2Minutes, lastRun: -1 },
            ],
            currentMinute: 1,
            expectedResult: 1,
        },
        {
            firstMinutes: 1,
            firstExecution: "second",
            secondMinutes: 2,
            secondExecution: "first",
            case: "1-2",
            tasks: [
                { task: task1Minutes, lastRun: initialTime + minute },
                { task: task2Minutes, lastRun: -1 },
            ],
            currentMinute: 2,
            expectedResult: 1,
        },
        {
            firstMinutes: 1,
            firstExecution: "third",
            case: "1-2",
            tasks: [
                { task: task1Minutes, lastRun: initialTime + 2 * minute },
                { task: task2Minutes, lastRun: initialTime + 2 * minute },
            ],
            currentMinute: 3,
            expectedResult: 1,
        },
    ];

    testCases.forEach((test) => {
        it(`calculates interval after ${test.firstMinutes} minutes task ${
            test.firstExecution
        }${
            test.secondMinutes
                ? ` and ${test.secondMinutes} minutes task ${test.secondExecution}`
                : ""
        } execution (case ${test.case})`, async () => {
            test.tasks.forEach(({ task, lastRun }) => (task.lastRun = lastRun));
            const sortedTasks = test.tasks.map(({ task }) => task);

            taskPlanner = new TaskManager(
                PlanningType.Scheduled,
                plannedTasksStore,
                foregroundChecker,
                minute / 2,
                initialTime + test.currentMinute * minute
            );
            spyOn(plannedTasksStore, "getAllSortedByNextRun")
                .withArgs(PlanningType.Scheduled)
                .and.returnValue(Promise.resolve(sortedTasks));
            const nextInterval = await taskPlanner.nextInterval();
            expect(nextInterval).toBe(test.expectedResult * minute);
        });
    });
});

function createForegroundCheckerMock(): ForegroundChecker {
    return {
        requiresForegroundThroughChain(taskName: string): boolean {
            return true;
        },
    } as ForegroundChecker;
}
