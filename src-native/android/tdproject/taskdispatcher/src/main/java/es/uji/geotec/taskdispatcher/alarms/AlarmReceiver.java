package es.uji.geotec.taskdispatcher.alarms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import es.uji.geotec.taskdispatcher.common.ReceiverActivationCache;

public class AlarmReceiver extends BroadcastReceiver {

    private static String tag = "AlarmReceiver";

    private static AlarmReceiverDelegate delegate;
    private static ReceiverActivationCache activationCache;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) {
            return;
        }

        Log.d(tag, "Native alarm triggered! Wait for it...");
        if (delegate != null) {
            delegate.onReceive(context, intent);
        } else {
            Log.w(tag, "Receiver delegate was not set! Caching method call...");
            activationCache = new ReceiverActivationCache(context, intent);
        }
    }

    public static void setAlarmReceiverDelegate(AlarmReceiverDelegate alarmReceiverDelegate) {
        delegate = alarmReceiverDelegate;
        if (activationCache != null) {
            delegate.onReceive(activationCache.getContext(), activationCache.getIntent());
            activationCache = null;
        }
    }
}
