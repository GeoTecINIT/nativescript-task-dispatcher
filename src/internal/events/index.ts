import { InternalEventManager } from "./internal-event-manager";
import { DispatchableEvent } from "./events";
import { EventCallback, EventReceiver } from "./event-receivers";

const internalEventManager = new InternalEventManager();

export { TaskDispatcherEvent, DispatchableEvent, createEvent } from "./events";
export { EventCallback, EventReceiver } from "./event-receivers";

export function on(
  eventName: string,
  eventReceiver: EventCallback | EventReceiver
): number {
  let receiver = eventReceiver as EventCallback;
  if ("onReceive" in eventReceiver) {
    receiver = (event) => eventReceiver.onReceive(event);
  }

  return internalEventManager.on(eventName, receiver);
}

export function off(eventName: string, listenerId?: number) {
  if (!listenerId) {
    internalEventManager.off(eventName);
  } else {
    internalEventManager.off(eventName, listenerId);
  }
}

export function emit(dispatchableEvent: DispatchableEvent) {
  internalEventManager.emit(dispatchableEvent);
}

export function hasListeners(eventName: string): boolean {
  return internalEventManager.hasListeners(eventName);
}
