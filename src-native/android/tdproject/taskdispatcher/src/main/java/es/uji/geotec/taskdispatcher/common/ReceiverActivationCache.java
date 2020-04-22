package es.uji.geotec.taskdispatcher.common;

import android.content.Context;
import android.content.Intent;

public class ReceiverActivationCache {
    private final Context context;
    private final Intent intent;

    public ReceiverActivationCache(Context context, Intent intent) {
        this.context = context;
        this.intent = intent;
    }

    public Context getContext() {
        return context;
    }

    public Intent getIntent() {
        return intent;
    }
}
