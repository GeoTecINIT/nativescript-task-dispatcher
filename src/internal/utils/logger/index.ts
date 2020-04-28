import { Logger } from "./common";
import { DevLogger } from "./dev";
import { ProdLogger } from "./prod";

let loggingEnabled = false;

function createLogger(tag: string): Logger {
  if (loggingEnabled) {
    return new DevLogger(tag);
  }
  return new ProdLogger(tag);
}

export type LoggerCreator = (tag: string) => Logger;

let loggerCreator: LoggerCreator = createLogger;

export function enableLogging() {
  loggingEnabled = true;
}

export function disableLogging() {
  loggingEnabled = false;
}

export function setLoggerCreator(creator: LoggerCreator) {
  loggerCreator = creator;
}

export function getLogger(tag: string): Logger {
  return loggerCreator(tag);
}

// FIXME: The export should be an interface in order to not to force developers to extend our logger
export { Logger } from "./common";
