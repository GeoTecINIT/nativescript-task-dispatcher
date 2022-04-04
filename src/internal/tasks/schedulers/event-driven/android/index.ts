import { Utils } from "@nativescript/core";

import { TaskChainLauncher } from "..";
import { EventData } from "../../../../events";
import { createTaskChainRunnerServiceIntent } from "./intents.android";

export class AndroidTaskChainLauncher implements TaskChainLauncher {
  launch(launchEvent: string, eventData?: EventData, eventId?: string): void {
    const context = Utils.android.getApplicationContext();
    const startTaskChainRunnerService = createTaskChainRunnerServiceIntent(
      context,
      {
        launchEvent,
        eventData,
        eventId,
      }
    );

    context.startService(startTaskChainRunnerService);
  }
}

let _androidTaskChainLauncher: AndroidTaskChainLauncher;
export function getAndroidTaskChainLauncher(): AndroidTaskChainLauncher {
  if (!_androidTaskChainLauncher) {
    _androidTaskChainLauncher = new AndroidTaskChainLauncher();
  }
  return _androidTaskChainLauncher;
}
