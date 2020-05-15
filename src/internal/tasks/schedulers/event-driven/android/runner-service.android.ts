import { Logger, getLogger } from "../../../../utils/logger";

export class TaskChainRunnerService
  implements
    es.uji.geotec.taskdispatcher.runners.TaskChainRunnerServiceDelegate {
  private nativeService: android.app.Service;
  private logger: Logger;

  private taskChainCount = 0;

  public onCreate(nativeService: globalAndroid.app.Service): void {
    this.nativeService = nativeService;

    this.logger = getLogger("TaskChainRunnerService");
    this.logger.debug("onCreate called");
  }

  public onStartCommand(
    intent: globalAndroid.content.Intent,
    flags: number,
    startId: number
  ): number {
    this.logger.info(`Service called {flags=${flags}, startId=${startId}}`);
    const startFlag = android.app.Service.START_REDELIVER_INTENT;
    this.taskChainStarted();
    setTimeout(() => {
      this.logger.info("Task finished running!");
      this.taskChainDone();
    }, 100);
    return startFlag;
  }

  public onDestroy(): void {
    this.logger.debug("onDestroy called");
  }

  private taskChainStarted() {
    this.taskChainCount++;
  }

  private taskChainDone() {
    this.taskChainCount--;
    if (this.taskChainCount === 0) {
      this.killWithFire();
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
