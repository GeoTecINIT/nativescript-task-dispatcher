import { DispatchableEvent } from "./events";

export type EventCallback = (event: DispatchableEvent) => void;

export interface EventReceiver {
  onReceive(dispatchableEvent: DispatchableEvent): void;
}
