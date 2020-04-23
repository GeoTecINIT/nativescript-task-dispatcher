package es.uji.geotec.taskdispatcher.alarms;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

import es.uji.geotec.taskdispatcher.common.ServiceActivationCache;

public class AlarmRunnerService extends Service {

    private static String tag = "AlarmRunnerService";

    private static AlarmRunnerServiceDelegate delegate;
    private static ServiceActivationCache activationCache = new ServiceActivationCache();

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(tag, "Native onCreate method called! Wait for it...");
        if (delegate != null) {
            delegate.onCreate(this);
        } else {
            Log.w(tag, "Service delegate was not set! Caching method call...");
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
            Log.w(tag, "Service delegate was not set! Caching method call...");
            activationCache.onDestroyEarlyCalled();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static void setAlarmRunnerServiceDelegate(AlarmRunnerServiceDelegate serviceDelegate) {
        delegate = serviceDelegate;
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
        if (activationCache.onDestroyWasEarlyCalled()) {
            delegate.onDestroy();
            activationCache.onDestroyEarlyCalledHandled();
        }
    }
}
