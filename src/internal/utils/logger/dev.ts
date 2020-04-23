import { Logger } from "./common";

export class DevLogger extends Logger {
  constructor(tag: string) {
    super(tag);
  }

  protected logDebug(message: string): void {
    console.info(message);
  }

  protected logInfo(message: string): void {
    console.info(message);
  }

  protected logWarning(message: string): void {
    console.warn(message);
  }

  protected logError(message: string): void {
    console.error(message);
  }
}
