package es.uji.geotec.taskdispatcher.alarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import es.uji.geotec.taskdispatcher.common.ReceiverActivationCache;

public class WatchdogReceiver extends BroadcastReceiver {
    private static WatchdogReceiverDelegate delegate;
    private static ReceiverActivationCache activationCache;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) {
            return;
        }

        Log.d("WatchdogReceiver", "Native watchdog triggered! Wait for it...");
        if (delegate != null) {
            delegate.onReceive(context, intent);
        } else {
            activationCache = new ReceiverActivationCache(context, intent);
        }
    }

    public static void setWatchdogReceiverDelegate(WatchdogReceiverDelegate watchdogReceiverDelegate) {
        delegate = watchdogReceiverDelegate;
        if (activationCache != null) {
            delegate.onReceive(activationCache.getContext(), activationCache.getIntent());
            activationCache = null;
        }
    }
}