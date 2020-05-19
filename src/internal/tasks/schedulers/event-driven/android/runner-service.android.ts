import { Logger, getLogger } from '../../../../utils/logger';
import {
  unpackTaskChainRunnerServiceIntent,
  TaskChainRunnerParams,
} from './intents.android';
import {
  createEvent,
  TaskDispatcherEvent,
  emit,
  on,
  DispatchableEvent,
  off,
} from '../../../../events';

const TIMEOUT = 180000;
const TIMEOUT_EVENT_OFFSET = 5000;

export class TaskChainRunnerService
  implements
    es.uji.geotec.taskdispatcher.runners.TaskChainRunnerServiceDelegate {
  private nativeService: android.app.Service;
  private wakeLock: android.os.PowerManager.WakeLock;

  private executionStart: number;
  private timeoutIds: Set<number>;
  private taskChainCount = 0;

  private logger: Logger;

  public onCreate(nativeService: globalAndroid.app.Service): void {
    this.nativeService = nativeService;

    this.wakeLock = taskChainRunnerWakeLock(nativeService);
    this.timeoutIds = new Set();

    this.logger = getLogger('TaskChainRunnerService');
    this.logger.debug('onCreate called');

    this.initializeExecutionWindow();
  }

  public onStartCommand(
    intent: globalAndroid.content.Intent,
    flags: number,
    startId: number
  ): number {
    this.logger.info(`Service called {flags=${flags}, startId=${startId}}`);
    if (intent) {
      this.taskChainStarted();
      this.processRequest(intent)
        .then(() => {
          this.logger.debug('Task chain finished running');
          this.taskChainDone();
        })
        .catch((err) => {
          this.logger.error(`Error while executing the task chain: ${err}`);
          this.taskChainDone();
        });
    }

    return android.app.Service.START_REDELIVER_INTENT;
  }

  public onDestroy(): void {
    this.logger.debug('onDestroy called');
  }

  private initializeExecutionWindow() {
    this.executionStart = new Date().getTime();
    this.wakeLock.acquire(TIMEOUT);
  }

  private async processRequest(intent: android.content.Intent) {
    const params = this.extractRequestParams(intent);
    const [launchEvent, timeoutId] = this.prepareTaskChainExecution(params);

    await this.startTaskChainExecution(launchEvent, timeoutId);
  }

  private taskChainStarted() {
    this.taskChainCount++;
  }

  private taskChainDone() {
    this.taskChainCount--;
    if (this.taskChainCount === 0) {
      this.gracefullyStop();
    }
  }

  private extractRequestParams(intent: android.content.Intent) {
    const params = unpackTaskChainRunnerServiceIntent(intent);
    this.logger.info(
      `Request params {launchEvent=${
        params.launchEvent
      }, eventData=${JSON.stringify(params.eventData)}${
        params.eventId ? `, eventId=${params.eventId}` : ''
      }}`
    );
    return params;
  }

  private prepareTaskChainExecution(
    params: TaskChainRunnerParams
  ): [DispatchableEvent, number] {
    const launchEvent = createEvent(params.launchEvent, {
      data: params.eventData,
    });

    if (params.eventId) {
      launchEvent.id = params.eventId;
    }
    const { id } = launchEvent;

    const timeoutEvent = createEvent(
      TaskDispatcherEvent.TaskExecutionTimedOut,
      {
        id,
      }
    );
    const timeout = this.calculateTimeout();
    this.logger.info(
      `Execution will timeout in ${timeout}, for tasks running with execution id: ${id}`
    );

    launchEvent.timeoutDate = this.getTimeoutDate(timeout);

    const timeoutId = setTimeout(() => {
      emit(timeoutEvent);
      this.logger.warn(
        `Execution timed out for tasks running with execution id: ${id}`
      );
    }, timeout);
    this.timeoutIds.add(timeoutId);

    return [launchEvent, timeoutId];
  }

  private startTaskChainExecution(
    launchEvent: DispatchableEvent,
    timeoutId: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const listenerId = on(TaskDispatcherEvent.TaskChainFinished, (evt) => {
        if (evt.id === launchEvent.id) {
          off(TaskDispatcherEvent.TaskChainFinished, listenerId);
          this.logger.info(
            `Task chain with id (${launchEvent.id}) finished its execution`
          );
          this.timeoutIds.delete(timeoutId);
          clearTimeout(timeoutId);
          resolve();
        }
      });
      emit(launchEvent);
    });
  }

  private calculateTimeout() {
    const now = new Date().getTime();
    const diff = now - this.executionStart;
    return TIMEOUT - TIMEOUT_EVENT_OFFSET - diff;
  }

  private getTimeoutDate(timeout: number): number {
    return new Date().getTime() + timeout;
  }

  private gracefullyStop() {
    this.logger.debug('Stopping service');
    this.killWithFire();
    for (const timeoutId of this.timeoutIds) {
      clearTimeout(timeoutId);
    }
    if (this.wakeLock.isHeld()) {
      this.wakeLock.release();
      this.logger.debug('Lock released');
    }
  }

  private killWithFire() {
    let startId = 1;
    let last = false;
    while (!last) {
      last = this.nativeService.stopSelfResult(startId);
      if (!last) {
        startId++;
      }
    }
    this.logger.info(`Done running (startId=${startId})`);
  }
}

function taskChainRunnerWakeLock(
  context: android.content.Context
): android.os.PowerManager.WakeLock {
  const wakeLockName = 'TaskDispatcher::TaskChainRunnerWakeLock';
  const powerManager = context.getSystemService(
    android.content.Context.POWER_SERVICE
  ) as android.os.PowerManager;

  return powerManager.newWakeLock(
    android.os.PowerManager.PARTIAL_WAKE_LOCK,
    wakeLockName
  );
}

let _taskChainRunnerService: TaskChainRunnerService;
export function getTaskChainRunnerService(): TaskChainRunnerService {
  if (!_taskChainRunnerService) {
    _taskChainRunnerService = new TaskChainRunnerService();
  }
  return _taskChainRunnerService;
}
