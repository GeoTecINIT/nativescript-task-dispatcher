import { Logger } from './common';

export class ProdLogger extends Logger {
  constructor(tag: string) {
    super(tag);
  }

  protected logDebug(message: string): void {
    return; // Do not print debug messages in production
  }

  protected async logInfo(message: string): Promise<void> {
    return; // Do not print info messages in production
  }

  protected async logWarning(message: string): Promise<void> {
    console.warn(message);
  }

  protected async logError(message: string): Promise<void> {
    console.error(message);
  }
}
