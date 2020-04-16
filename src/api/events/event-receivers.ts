import { PlatformEvent } from './events';

export type EventCallback = (data: PlatformEvent) => void;

export interface EventReceiver {
  onReceive(platformEvent: PlatformEvent): void;
}
