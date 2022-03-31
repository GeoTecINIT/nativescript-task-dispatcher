import { createPlannedTaskStoreMock } from "../persistence";
import { TaskCancelManager } from "nativescript-task-dispatcher/internal/tasks/cancel-manager";
import { TaskScheduler } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based";
import { RunnableTask } from "nativescript-task-dispatcher/internal/tasks/runnable-task";
import {
    TaskDispatcherEvent,
    hasListeners,
    on,
    off,
    createEvent,
    emit,
} from "nativescript-task-dispatcher/internal/events";
import {
    PlannedTask,
    PlanningType,
    SchedulerType,
} from "nativescript-task-dispatcher/internal/tasks/planner/planned-task";

describe("Task cancel manager", () => {
    const taskStore = createPlannedTaskStoreMock();
    const taskScheduler = createTaskSchedulerMock();
    let cancelManager: TaskCancelManager;

    const cancelScheduledTasks = "cancelScheduledTasks";
    const cancelImmediateTasks = "cancelImmediateTasks";
    const cancelExtraImmediateTasks = "cancelExtraImmediateTasks";

    const firstScheduledTask = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 60000,
            recurrent: true,
            params: {},
        }
    );

    const secondScheduledTask = new PlannedTask(
        PlanningType.Scheduled,
        SchedulerType.Alarm,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 120000,
            recurrent: false,
            params: {},
        }
    );

    const firstImmediateTask = new PlannedTask(
        PlanningType.Immediate,
        SchedulerType.None,
        {
            name: "dummyTask",
            startAt: -1,
            interval: 0,
            recurrent: false,
            params: {},
        }
    );

    const secondImmediateTask = new PlannedTask(
        PlanningType.Immediate,
        SchedulerType.None,
        {
            name: "anotherDummyTask",
            startAt: -1,
            interval: 0,
            recurrent: false,
            params: {},
        }
    );

    const extraImmediateTask = new PlannedTask(
        PlanningType.Immediate,
        SchedulerType.None,
        {
            name: "yetAnotherDummyTask",
            startAt: -1,
            interval: 0,
            recurrent: false,
            params: {},
            cancelEvent: cancelExtraImmediateTasks,
        }
    );

    beforeEach(() => {
        cancelManager = new TaskCancelManager(taskStore, taskScheduler);
        spyOn(taskStore, "getAllCancelEvents").and.returnValue(
            Promise.resolve([cancelScheduledTasks, cancelImmediateTasks])
        );
    });

    it("obtains and listen to task cancellation events", async () => {
        await cancelManager.init();
        expect(taskStore.getAllCancelEvents).toHaveBeenCalled();
        expect(hasListeners(cancelScheduledTasks)).toBeTruthy();
        expect(hasListeners(cancelImmediateTasks)).toBeTruthy();
    });

    it("cancels scheduled tasks when its cancellation event gets received", async () => {
        spyOn(taskStore, "getAllFilteredByCancelEvent")
            .withArgs(cancelScheduledTasks)
            .and.returnValue(
                Promise.resolve([firstScheduledTask, secondScheduledTask])
            );
        spyOn(taskScheduler, "cancel").and.returnValue(Promise.resolve());

        await initCancelManagerAndListenForTaskCancel(
            cancelManager,
            cancelScheduledTasks
        );

        expect(taskStore.getAllFilteredByCancelEvent).toHaveBeenCalledWith(
            cancelScheduledTasks
        );
        expect(taskScheduler.cancel).toHaveBeenCalledWith(
            firstScheduledTask.id
        );
        expect(taskScheduler.cancel).toHaveBeenCalledWith(
            secondScheduledTask.id
        );
    });

    it("removes immediate tasks data when its cancellation event gets received", async () => {
        spyOn(taskStore, "getAllFilteredByCancelEvent")
            .withArgs(cancelImmediateTasks)
            .and.returnValue(
                Promise.resolve([firstImmediateTask, secondImmediateTask])
            );
        spyOn(taskStore, "delete").and.returnValue(Promise.resolve());

        await initCancelManagerAndListenForTaskCancel(
            cancelManager,
            cancelImmediateTasks
        );

        expect(taskStore.getAllFilteredByCancelEvent).toHaveBeenCalledWith(
            cancelImmediateTasks
        );
        expect(taskStore.delete).toHaveBeenCalledWith(firstImmediateTask.id);
        expect(taskStore.delete).toHaveBeenCalledWith(secondImmediateTask.id);
    });

    it("removes after-init immediate tasks data when its cancellation event gets received", async () => {
        spyOn(taskStore, "getAllFilteredByCancelEvent")
            .withArgs(cancelExtraImmediateTasks)
            .and.returnValue(Promise.resolve([extraImmediateTask]));
        spyOn(taskStore, "delete").and.returnValue(Promise.resolve());

        const cancelEvent = createEvent(cancelExtraImmediateTasks);
        const chainFinished = listenToTaskChainFinishedEvent(cancelEvent.id);

        cancelManager.add(extraImmediateTask);
        emit(cancelEvent);
        await chainFinished;

        expect(taskStore.getAllFilteredByCancelEvent).toHaveBeenCalledWith(
            cancelExtraImmediateTasks
        );
        expect(taskStore.delete).toHaveBeenCalledWith(extraImmediateTask.id);
    });

    afterEach(() => {
        off(cancelScheduledTasks);
        off(cancelImmediateTasks);
        off(cancelExtraImmediateTasks);
    });
});

function createTaskSchedulerMock(): TaskScheduler {
    return {
        schedule(task: RunnableTask) {
            return Promise.resolve(null);
        },
        cancel(taskId: string) {
            return Promise.resolve();
        },
    };
}

async function initCancelManagerAndListenForTaskCancel(
    cancelManager: TaskCancelManager,
    cancelEventName: string
) {
    const cancelEvent = createEvent(cancelEventName);
    const chainFinished = listenToTaskChainFinishedEvent(cancelEvent.id);

    await cancelManager.init();
    emit(cancelEvent);
    await chainFinished;
}

function listenToTaskChainFinishedEvent(eventId: string): Promise<void> {
    return new Promise((resolve) => {
        const listenerId = on(TaskDispatcherEvent.TaskChainFinished, (evt) => {
            if (evt.id === eventId) {
                off(TaskDispatcherEvent.TaskChainFinished, listenerId);
                resolve();
            }
        });
    });
}
