import { createLibComponentIntent } from "../../intent-tools.android";
import { EventData } from "../../../../events/events";

export function createTaskChainRunnerServiceIntent(
  appContext: android.content.Context,
  params: TaskChainRunnerParams
) {
  const intent = createLibComponentIntent(appContext, {
    relativeClassPath: ".runners.TaskChainRunnerService",
  });
  intent.putExtra(TCRS_LAUNCH_EVENT, params.launchEvent);
  intent.putExtra(TCRS_EVENT_DATA, JSON.stringify(params.eventData));
  if (params.eventId) {
    intent.putExtra(TCRS_EVENT_ID, params.eventId);
  }

  return intent;
}

export function unpackTaskChainRunnerServiceIntent(
  intent: android.content.Intent
): TaskChainRunnerParams {
  if (!intent) {
    return null;
  }

  const taskChainRunnerParams: TaskChainRunnerParams = {
    launchEvent: intent.getStringExtra(TCRS_LAUNCH_EVENT),
    eventData: JSON.parse(intent.getStringExtra(TCRS_EVENT_DATA)),
  };

  if (intent.hasExtra(TCRS_EVENT_ID)) {
    taskChainRunnerParams.eventId = intent.getStringExtra(TCRS_EVENT_ID);
  }

  return taskChainRunnerParams;
}

const TCRS_LAUNCH_EVENT = "launchEvent";
const TCRS_EVENT_DATA = "eventData";
const TCRS_EVENT_ID = "eventId";

export interface TaskChainRunnerParams {
  launchEvent: string;
  eventData: EventData;
  eventId?: string;
}
