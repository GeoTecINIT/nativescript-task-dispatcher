import { isAndroid } from "@nativescript/core";

export function now(): number {
  if (isAndroid) {
    return java.lang.System.currentTimeMillis();
  } else {
    return Math.round(NSDate.date().timeIntervalSince1970 * 1000.0);
  }
}
