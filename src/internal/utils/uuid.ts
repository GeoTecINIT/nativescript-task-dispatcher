import { isAndroid } from "@nativescript/core";

export function uuid() {
  if (isAndroid) {
    return java.util.UUID.randomUUID().toString();
  } else {
    return NSUUID.UUID().UUIDString.toLowerCase();
  }
}
