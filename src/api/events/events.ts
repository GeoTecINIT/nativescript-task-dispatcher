import { uuid } from '../utils/uuid';

export enum CoreEvent {
  TaskExecutionStarted = 'taskExecutionStarted',
  TaskExecutionTimedOut = 'taskExecutionTimedOut',
  TaskChainFinished = 'taskChainFinished',
  DefaultCancelEvent = 'defaultCancelEvent',
}

export interface PlatformEvent {
  name: string;
  id: string;
  data: EventData;
}

interface EventData {
  [key: string]: any;
}

export function createEvent(
  name: string,
  params: CreateEventParams = {}
): PlatformEvent {
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
