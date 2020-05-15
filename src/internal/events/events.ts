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

  return {
    name,
    id,
    data,
  };
}

interface CreateEventParams {
  data?: EventData;
  id?: string;
}
