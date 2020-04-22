package es.uji.geotec.taskdispatcher.common;

import android.content.Context;
import android.content.Intent;

public interface BroadcastReceiverDelegate {
    void onReceive(Context context, Intent intent);
}
