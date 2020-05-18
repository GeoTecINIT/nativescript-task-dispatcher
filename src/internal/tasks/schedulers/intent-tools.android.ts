const libPackage = "es.uji.geotec.taskdispatcher";

export function createLibComponentIntent(
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
