import { android as androidApp } from 'tns-core-modules/application/application';

export function uuid() {
  if (androidApp) {
    return java.util.UUID.randomUUID().toString();
  } else {
    return NSUUID.UUID().UUIDString.toLowerCase();
  }
}
