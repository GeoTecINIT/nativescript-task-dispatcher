package es.uji.geotec.taskdispatcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    private static BootReceiverDelegate delegate;

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d("BootReceiver", "Native boot completed! Wait for it...");
        delegate.onReceive(context, intent);
    }

    public static void setBootReceiverDelegate(BootReceiverDelegate bootReceiverDelegate) {
        delegate = bootReceiverDelegate;
    }
}
