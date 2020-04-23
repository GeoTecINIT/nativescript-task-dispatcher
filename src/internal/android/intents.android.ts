export const libPackage = "es.uji.geotec.taskdispatcher";

// TODO: Add a way to configure MainActivity reference
// in order to support apps with custom launch activities
export function createAppLaunchIntent(appContext: android.content.Context) {
  const intent = createAppComponentIntent(appContext, {
    pathPrefix: "com.tns",
    relativeClassPath: ".NativeScriptActivity",
  });

  return intent;
}

export function createAlarmReceiverIntent(appContext: android.content.Context) {
  return createAppComponentIntent(appContext, {
    relativeClassPath: ".alarms.AlarmReceiver",
  });
}

export function createWatchdogReceiverIntent(
  appContext: android.content.Context
) {
  return createAppComponentIntent(appContext, {
    relativeClassPath: ".alarms.WatchdogReceiver",
  });
}

export function createSavingsDeactivationIntent() {
  return new android.content.Intent(
    android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
    android.net.Uri.parse(`package:${libPackage}`)
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
  const intent = createAppComponentIntent(appContext, {
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
      new Date().getTime()
    ),
  };
}

function createAppComponentIntent(
  appContext: android.content.Context,
  componentReference: AppComponentRef
): android.content.Intent {
  const { pathPrefix, relativeClassPath } = componentReference;
  const pkg = pathPrefix ? pathPrefix : libPackage;
  const intent = new android.content.Intent();
  const componentRef = new android.content.ComponentName(
    appContext,
    pkg + relativeClassPath
  );
  intent.setComponent(componentRef);

  return intent;
}

interface AppComponentRef {
  pathPrefix?: string;
  relativeClassPath: string;
}
