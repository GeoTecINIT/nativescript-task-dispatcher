import { TaskParams } from '../task';

export interface RunnableTask {
  name: string;
  startAt: number;
  interval: number;
  recurrent: boolean;
  params: TaskParams;
  cancelEvent?: string;
}
