import { Utils } from "@nativescript/core";

import { createAppLaunchIntent } from "./intents.android";
import { getLogger, Logger } from "../../../../utils/logger";

// Member numbers are notification unique ids, only the first one is needed
export enum AndroidNotification {
  LocationUsage = 1000,
}

let _notificationChannels: Map<AndroidNotification, NotificationChannel>;
function notificationChannels(
  context: android.content.Context
): Map<AndroidNotification, NotificationChannel> {
  if (!_notificationChannels) {
    const getString = createStringFetcher(context);
    const NotificationManagerCompat =
      androidx.core.app.NotificationManagerCompat;
    _notificationChannels = new Map<AndroidNotification, NotificationChannel>();

    try {
      _notificationChannels.set(AndroidNotification.LocationUsage, {
        id: "LOCATION_USAGE",
        name: getString("task_dispatcher_channel_name"),
        description: getString("task_dispatcher_channel_description"),
        priority: NotificationManagerCompat.IMPORTANCE_LOW,
      });
    } catch (e) {
      logger().debug(
        `No strings set for ${AndroidNotification.LocationUsage} channel. Skipping...`
      );
    }
  }

  return _notificationChannels;
}

export function setupNotificationChannels(context: android.content.Context) {
  const sdkInt = android.os.Build.VERSION.SDK_INT;
  if (sdkInt < 26) {
    return;
  }
  for (const channel of notificationChannels(context).values()) {
    setupNotificationChannel(context, channel);
  }
}

export function createNotification(
  context: android.content.Context,
  type: AndroidNotification
): android.app.Notification {
  if (!notificationChannels(context).has(type)) {
    throw new Error(
      `Translation strings had not been setup for ${AndroidNotification[type]} notification type. Please follow setup instructions.`
    );
  }

  let notificationBuilder: androidx.core.app.NotificationCompat.Builder;
  switch (type) {
    case AndroidNotification.LocationUsage:
      const appLaunchIntent = createAppLaunchIntent(context);
      const pendingIntent = android.app.PendingIntent.getActivity(
        context,
        0,
        appLaunchIntent,
        android.os.Build.VERSION.SDK_INT >= 23
          ? android.app.PendingIntent.FLAG_IMMUTABLE
          : 0
      );
      notificationBuilder = initializeNotificationBuilder(
        context,
        type,
        "task_dispatcher_notification_title",
        "task_dispatcher_notification_content"
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
  const getIcon = createIconFetcher(context);
  const { id, priority } = notificationChannels(context).get(type);
  const iconId = getIcon();

  const getString = createStringFetcher(context);
  return new androidx.core.app.NotificationCompat.Builder(context, id)
    .setSmallIcon(iconId)
    .setContentTitle(getString(title))
    .setContentText(getString(content))
    .setPriority(priority);
}

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  priority: number;
}

function createStringFetcher(context: android.content.Context) {
  return (key: string): string =>
    context.getResources().getString(Utils.android.resources.getStringId(key));
}

function createIconFetcher(context: android.content.Context) {
  const getDrawableId = createDrawableIdFetcher(context);
  return (key?: string): number => {
    let icon = 0;
    if (key && key.indexOf(Utils.RESOURCE_PREFIX) === 0) {
      icon = getDrawableId(key.substr(Utils.RESOURCE_PREFIX.length));
    }
    if (icon === 0 && android.os.Build.VERSION.SDK_INT >= 21) {
      icon = getDrawableId("ic_stat_notify_silhouette");
    }
    if (icon === 0) {
      icon = getDrawableId("ic_stat_notify");
    }
    if (icon === 0) {
      icon = context.getApplicationInfo().icon;
    }
    return icon;
  };
}

function createDrawableIdFetcher(context: android.content.Context) {
  const resources = context.getResources();
  const packageName = context.getApplicationInfo().packageName;
  return (key: string): number => {
    return resources.getIdentifier(key, "drawable", packageName);
  };
}

let _logger: Logger;
function logger(): Logger {
  if (!_logger) {
    _logger = getLogger("NotificationManager");
  }
  return _logger;
}
