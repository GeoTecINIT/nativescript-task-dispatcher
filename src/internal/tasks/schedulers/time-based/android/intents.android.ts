import { createLibComponentIntent } from "../../intent-tools.android";

// TODO: Add a way to configure MainActivity reference
// in order to support apps with custom launch activities
export function createAppLaunchIntent(appContext: android.content.Context) {
  return createLibComponentIntent(appContext, {
    pathPrefix: "com.tns",
    relativeClassPath: ".NativeScriptActivity",
  });
}

export function createAlarmReceiverIntent(appContext: android.content.Context) {
  return createLibComponentIntent(appContext, {
    relativeClassPath: ".alarms.AlarmReceiver",
  });
}

export function createWatchdogReceiverIntent(
  appContext: android.content.Context
) {
  return createLibComponentIntent(appContext, {
    relativeClassPath: ".alarms.WatchdogReceiver",
  });
}

export function createSavingsDeactivationIntent(appPackage: string) {
  return new android.content.Intent(
    android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
    android.net.Uri.parse(`package:${appPackage}`)
  );
}

const ARS_RUN_IN_FOREGROUND = "foreground";
const ARS_TIME_OFFSET = "time-offset";
const ARS_INVOCATION_TIME = "invocation-time";
interface AlarmRunnerParams {
  runInForeground: boolean;
  timeOffset: number;
  invocationTime: number;
}

export function createAlarmRunnerServiceIntent(
  appContext: android.content.Context,
  params: AlarmRunnerParams
) {
  const intent = createLibComponentIntent(appContext, {
    relativeClassPath: ".alarms.AlarmRunnerService",
  });
  intent.putExtra(ARS_RUN_IN_FOREGROUND, params.runInForeground);
  intent.putExtra(ARS_TIME_OFFSET, params.timeOffset);
  intent.putExtra(ARS_INVOCATION_TIME, params.invocationTime);

  return intent;
}

export function unpackAlarmRunnerServiceIntent(
  intent: android.content.Intent
): AlarmRunnerParams {
  if (!intent) {
    return null;
  }

  return {
    runInForeground: intent.getBooleanExtra(ARS_RUN_IN_FOREGROUND, false),
    timeOffset: intent.getIntExtra(ARS_TIME_OFFSET, 0),
    invocationTime: intent.getLongExtra(
      ARS_INVOCATION_TIME,
      java.lang.System.currentTimeMillis()
    ),
  };
}
