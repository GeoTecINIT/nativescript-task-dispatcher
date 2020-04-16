export abstract class Logger {
  constructor(private tag: string) {}

  debug(message: any) {
    this.logDebug(this.formatMessage(LogType.Debug, message));
  }

  info(message: any) {
    this.logInfo(this.formatMessage(LogType.Info, message));
  }

  warn(message: any) {
    this.logWarning(this.formatMessage(LogType.Warning, message));
  }

  error(message: any) {
    this.logError(this.formatMessage(LogType.Error, message));
  }

  protected abstract logDebug(message: string): void;

  protected abstract logInfo(message: string): void;

  protected abstract logWarning(message: string): void;

  protected abstract logError(message: string): void;

  private formatMessage(type: LogType, message: string) {
    return `[${type}] ${this.tag}: ${message}`;
  }
}

enum LogType {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warning = 'WARN',
  Error = 'ERROR',
}
