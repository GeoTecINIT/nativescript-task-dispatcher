import {
    TaskChainLauncher,
    taskChainLauncher as getTaskChainLauncher,
} from "nativescript-task-dispatcher/internal/tasks/schedulers/event-driven";
import { setTaskChainLauncherCreator } from "nativescript-task-dispatcher//internal/tasks/schedulers/event-driven/common";

import { EventData } from "nativescript-task-dispatcher/internal/events/events";
import { on, off } from "nativescript-task-dispatcher/internal/events";

describe("Task chain launcher", () => {
    let taskChainLauncher: TaskChainLauncher;
    let nativeTaskChainLauncher: TaskChainLauncher;

    beforeEach(() => {
        nativeTaskChainLauncher = createNativeTaskChainLauncherMock();
        setTaskChainLauncherCreator(() => nativeTaskChainLauncher);
        spyOn(nativeTaskChainLauncher, "launch");

        taskChainLauncher = getTaskChainLauncher();
    });

    it("delegates chain launch to native executor when event has listeners", () => {
        const event = "interestingEvent";
        const data = { param: "a param" };
        const eventId = "anId";
        const listenerId = on(event, () => null);
        taskChainLauncher.launch(event, data, eventId);
        expect(nativeTaskChainLauncher.launch).toHaveBeenCalledWith(
            event,
            data,
            eventId
        );
        off(event, listenerId);
    });

    it("does nothing when event has no listeners", () => {
        const event = "boringEvent";
        taskChainLauncher.launch(event);
        expect(nativeTaskChainLauncher.launch).not.toHaveBeenCalled();
    });
});

function createNativeTaskChainLauncherMock(): TaskChainLauncher {
    return {
        launch(launchEvent: string, data: EventData) {
            return null;
        },
    };
}
