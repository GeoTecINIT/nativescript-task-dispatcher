package es.uji.geotec.taskdispatcher;

import android.content.Context;
import android.content.Intent;

public interface BootReceiverDelegate {
    void onReceive(Context context, Intent intent);
}
