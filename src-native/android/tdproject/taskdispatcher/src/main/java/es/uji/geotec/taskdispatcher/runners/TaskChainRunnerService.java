package es.uji.geotec.taskdispatcher.runners;

import android.annotation.SuppressLint;
import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

import es.uji.geotec.taskdispatcher.common.ServiceActivationCache;

public class TaskChainRunnerService extends Service {

    private static String tag = "TaskChainRunnerService";

    @SuppressLint("StaticFieldLeak")
    private static ServiceActivationCache activationCache;
    private static TaskChainRunnerServiceDelegate delegate;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(tag, "Native onCreate method called! Wait for it...");
        if (delegate != null) {
            delegate.onCreate(this);
        } else {
            Log.w(tag, "Service delegate was not set! Caching method call...");
            activationCache = new ServiceActivationCache();
            activationCache.onCreateEarlyCalled(this);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        Log.d(tag, "Native onStartCommand method called! Wait for it...");
        if (delegate != null) {
            return delegate.onStartCommand(intent, flags, startId);
        }

        Log.w(tag, "Service delegate was not set! Caching method call...");
        activationCache.onStartCommandEarlyCalled(intent, flags, startId);
        return START_REDELIVER_INTENT;
    }

    @Override
    public void onDestroy() {
        Log.d(tag, "Native onDestroy method called! Wait for it...");
        if (delegate != null) {
            delegate.onDestroy();
        } else {
            Log.w(tag, "Service delegate was not set! Cleaning up!");
            activationCache = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static void setTaskChainRunnerServiceDelegate(TaskChainRunnerServiceDelegate serviceDelegate) {
        delegate = serviceDelegate;
        if (activationCache == null) return;
        if (activationCache.onCreateWasEarlyCalled()) {
            delegate.onCreate(activationCache.getService());
            activationCache.onCreateEarlyCalledHandled();
        }
        if (activationCache.onStartCommandWasEarlyCalled()) {
            delegate.onStartCommand(
                    activationCache.getStartIntent(),
                    activationCache.getStartFlags(),
                    activationCache.getStartId()
            );
            activationCache.onStartCommandEarlyCalledHandled();
        }
    }
}
