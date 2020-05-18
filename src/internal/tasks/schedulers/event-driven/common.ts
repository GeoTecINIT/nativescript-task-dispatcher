import { EventData } from "../../../events/events";
import { hasListeners } from "../../../events";

export interface TaskChainLauncher {
  launch(launchEvent: string, data?: EventData, eventId?: string): void;
}

let _taskChainLauncherCreator: () => TaskChainLauncher = () => null;

export function setTaskChainLauncherCreator(creator: () => TaskChainLauncher) {
  _taskChainLauncherCreator = creator;
}

export function taskChainLauncher() {
  return new CommonTaskChainLauncher(_taskChainLauncherCreator());
}

class CommonTaskChainLauncher implements TaskChainLauncher {
  constructor(private nativeTaskChainLauncher: TaskChainLauncher) {}

  launch(launchEvent: string, data: EventData = {}, eventId?: string): void {
    if (!hasListeners(launchEvent)) {
      return;
    }
    this.nativeTaskChainLauncher.launch(launchEvent, data, eventId);
  }
}
