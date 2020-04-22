package es.uji.geotec.taskdispatcher.common;

import android.app.Service;
import android.content.Intent;

public class ServiceActivationCache {

    private boolean onCreateCalled;
    private boolean onStartCommandCalled;
    private boolean onDestroyCalled;

    private Service service;

    private Intent startIntent;
    private int startFlags = -1;
    private int startId = -1;

    public void onCreateEarlyCalled(Service service) {
        onCreateCalled = true;
        this.service = service;
    }

    public void onCreateEarlyCalledHandled() {
        onCreateCalled = false;
        service = null;
    }

    public void onStartCommandEarlyCalled(Intent intent, int flags, int startId) {
        onStartCommandCalled = true;
        startIntent = intent;
        startFlags = flags;
        this.startId = startId;
    }

    public void onStartCommandEarlyCalledHandled() {
        onStartCommandCalled = false;
        startIntent = null;
        startFlags = -1;
        startId = -1;
    }

    public void onDestroyEarlyCalled() {
        onDestroyCalled = true;
    }

    public void onDestroyEarlyCalledHandled() {
        onDestroyCalled = false;
    }

    public boolean onCreateWasEarlyCalled() {
        return onCreateCalled;
    }

    public boolean onStartCommandWasEarlyCalled() {
        return onStartCommandCalled;
    }

    public boolean onDestroyWasEarlyCalled() {
        return onDestroyCalled;
    }

    public Service getService() {
        return service;
    }

    public Intent getStartIntent() {
        return startIntent;
    }

    public int getStartFlags() {
        return startFlags;
    }

    public int getStartId() {
        return startId;
    }
}
