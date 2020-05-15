import { TaskChainLauncher } from "..";
import { EventData } from "../../../../events/events";

export class AndroidTaskChainLauncher implements TaskChainLauncher {
  launch(launchEvent: string, data?: EventData, eventId?: string): void {
    throw new Error("Method not implemented.");
  }
}
