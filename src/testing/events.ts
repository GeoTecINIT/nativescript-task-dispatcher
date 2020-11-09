import { EventData } from "../events";
import { off, on } from "../internal/events";

export function listenToEventTrigger(
  eventName: string,
  eventId: string
): Promise<EventData> {
  return new Promise((resolve) => {
    const listenerId = on(eventName, (evt) => {
      if (evt.id === eventId) {
        off(eventName, listenerId);
        resolve(evt.data);
      }
    });
  });
}

export { createEvent, emit } from "../internal/events";
