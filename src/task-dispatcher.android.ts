import { Common } from './task-dispatcher.common';
import { BootReceiver } from './android/boot-receiver.android';

const bootReceiver = new BootReceiver();

class TaskDispatcher extends Common {
  public init(): void {
    es.uji.geotec.taskdispatcher.BootReceiver.setBootReceiverDelegate(
      new es.uji.geotec.taskdispatcher.BootReceiverDelegate({
        onReceive: (context, intent) => bootReceiver.onReceive(context, intent),
      })
    );
  }
}

export const taskDispatcher = new TaskDispatcher();
