import { InternalEventManager } from "nativescript-task-dispatcher/internal/events/internal-event-manager";
import { EventCallback } from "nativescript-task-dispatcher/internal/events";

describe("Event manager", () => {
    const eventName = "dummyEvent";
    const dispatchableEvent = {
        name: eventName,
        id: "uniqueEventId",
        expirationTimestamp: -1,
        data: { param: "patata" },
    };
    let internalEventManager: InternalEventManager;
    let dummyCallback: EventCallback;
    let anotherDummyCallback: EventCallback;

    beforeEach(() => {
        internalEventManager = new InternalEventManager();
        dummyCallback = jasmine.createSpy("dummyCallback");
        anotherDummyCallback = jasmine.createSpy("anotherDummyCallback");
    });

    afterEach(() => {
        internalEventManager.off(eventName);
    });

    it("allows to register an event subscription", () => {
        const listenerId = internalEventManager.on(eventName, dummyCallback);
        internalEventManager.emit(dispatchableEvent);
        expect(dummyCallback).toHaveBeenCalledWith(dispatchableEvent);
        expect(listenerId).toEqual(jasmine.any(Number));
    });

    it("allows to unregister an event subscription", () => {
        const listenerId = internalEventManager.on(eventName, dummyCallback);
        internalEventManager.off(eventName, listenerId);
        internalEventManager.emit(dispatchableEvent);
        expect(dummyCallback).not.toHaveBeenCalled();
    });

    it("allows to register multiple event subscriptions", () => {
        internalEventManager.on(eventName, dummyCallback);
        internalEventManager.on(eventName, anotherDummyCallback);
        internalEventManager.emit(dispatchableEvent);
        expect(dummyCallback).toHaveBeenCalledWith(dispatchableEvent);
        expect(anotherDummyCallback).toHaveBeenCalledWith(dispatchableEvent);
    });

    it("allows to unregister one of the event subscriptions", () => {
        const listenerId = internalEventManager.on(eventName, dummyCallback);
        internalEventManager.on(eventName, anotherDummyCallback);
        internalEventManager.off(eventName, listenerId);
        internalEventManager.emit(dispatchableEvent);
        expect(dummyCallback).not.toHaveBeenCalled();
        expect(anotherDummyCallback).toHaveBeenCalledWith(dispatchableEvent);
    });

    it("allows to check if an unlistened event has listeners", () => {
        const hasListeners = internalEventManager.hasListeners(eventName);

        expect(hasListeners).toBeFalsy();
    });

    it("allows to check if a listened event has listeners", () => {
        internalEventManager.on(eventName, dummyCallback);
        const hasListeners = internalEventManager.hasListeners(eventName);

        expect(hasListeners).toBeTruthy();
    });
});
