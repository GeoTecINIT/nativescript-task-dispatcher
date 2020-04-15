export class BootReceiver implements es.uji.geotec.taskdispatcher.BootReceiver {
  onReceive(context: android.content.Context, intent: android.content.Intent) {
    this.handleOnReceive();
  }

  private handleOnReceive() {
    console.log('Boot completed!');
  }
}
