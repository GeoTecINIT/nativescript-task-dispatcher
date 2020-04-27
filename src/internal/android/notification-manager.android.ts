import { createAppLaunchIntent } from "./intents.android";

// Member numbers are notification unique ids, only the first one is needed
export enum AndroidNotification {
  LocationTracking = 1000,
}

let _notificationChannels: Map<AndroidNotification, NotificationChannel>;
function notificationChannels(): Map<AndroidNotification, NotificationChannel> {
  if (!_notificationChannels) {
    const NotificationManagerCompat =
      androidx.core.app.NotificationManagerCompat;
    _notificationChannels = new Map([
      [
        AndroidNotification.LocationTracking,
        {
          id: "LOCATION_TRACKING",
          name: "Background location",
          description:
            "Indicates when the app is accessing your location in background",
          priority: NotificationManagerCompat.IMPORTANCE_LOW,
        },
      ],
    ]);
  }

  return _notificationChannels;
}

export function setupNotificationChannels(context: android.content.Context) {
  const sdkInt = android.os.Build.VERSION.SDK_INT;
  if (sdkInt < 26) {
    return;
  }
  for (const channel of notificationChannels().values()) {
    setupNotificationChannel(context, channel);
  }
}

export function createNotification(
  context: android.content.Context,
  type: AndroidNotification
): android.app.Notification {
  let notificationBuilder: androidx.core.app.NotificationCompat.Builder;
  switch (type) {
    case AndroidNotification.LocationTracking:
      const appLaunchIntent = createAppLaunchIntent(context);
      const pendingIntent = android.app.PendingIntent.getActivity(
        context,
        0,
        appLaunchIntent,
        0
      );
      notificationBuilder = initializeNotificationBuilder(
        context,
        type,
        "Demo app is using your location",
        ""
      ).setContentIntent(pendingIntent);

      break;
  }

  return notificationBuilder ? notificationBuilder.build() : null;
}

function setupNotificationChannel(
  context: android.content.Context,
  channel: NotificationChannel
) {
  const notificationManager = context.getSystemService(
    android.app.NotificationManager.class
  ) as android.app.NotificationManager;
  if (!notificationManager) {
    return;
  }

  const { id, name, description, priority } = channel;
  const ch = new android.app.NotificationChannel(id, name, priority);
  ch.setDescription(description);

  notificationManager.createNotificationChannel(ch);
}

function initializeNotificationBuilder(
  context: android.content.Context,
  type: AndroidNotification,
  title: string,
  content: string
) {
  const { id, priority } = notificationChannels().get(type);
  const iconId = context
    .getResources()
    .getIdentifier(
      "icon",
      "drawable",
      context.getApplicationInfo().packageName
    );

  return new androidx.core.app.NotificationCompat.Builder(context, id)
    .setSmallIcon(iconId)
    .setContentTitle(title)
    .setContentText(content)
    .setPriority(priority);
}

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  priority: number;
}
