import { uuid } from "../utils/uuid";

export enum TaskDispatcherEvent {
  TaskExecutionStarted = "taskExecutionStarted",
  TaskExecutionTimedOut = "taskExecutionTimedOut",
  TaskChainFinished = "taskChainFinished",
  DefaultCancelEvent = "defaultCancelEvent",
}

export interface DispatchableEvent {
  name: string;
  id: string;
  expirationTimestamp: number;
  data: EventData;
}

export interface EventData {
  [key: string]: any;
}

export function createEvent(
  name: string,
  params: CreateEventParams = {}
): DispatchableEvent {
  const id = params.id ? params.id : uuid();
  const data = params.data ? params.data : {};
  const expirationTimestamp = params.expirationTimestamp
    ? params.expirationTimestamp
    : -1;

  return {
    name,
    id,
    expirationTimestamp,
    data,
  };
}

interface CreateEventParams {
  data?: EventData;
  id?: string;
  expirationTimestamp?: number;
}
