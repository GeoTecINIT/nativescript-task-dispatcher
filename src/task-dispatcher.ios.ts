import { Common } from './task-dispatcher.common';

class TaskDispatcher extends Common {
  public init(): void {
    throw new Error('Method not implemented.');
  }
}

export const taskDispatcher = new TaskDispatcher();
