import { uuid } from "../../utils/uuid";
import { now } from "../../utils/time";
import { RunnableTask } from "../runnable-task";
import { TaskParams } from "../task";

export enum PlanningType {
  Scheduled = "scheduled",
  Immediate = "immediate",
}

export enum SchedulerType {
  None = "none",
  Alarm = "alarm",
}

export class PlannedTask {
  name: string;
  startAt: number;
  interval: number;
  recurrent: boolean;
  params: TaskParams;
  cancelEvent: string;

  get lastUpdate(): number {
    return this.lastRun !== -1 ? this.lastRun : this.createdAt;
  }

  constructor(
    public planningType: PlanningType,
    public schedulerType: SchedulerType,
    task: RunnableTask,
    public id = uuid(),
    public createdAt = now(),
    public lastRun = -1,
    public errorCount = 0,
    public timeoutCount = 0
  ) {
    this.name = task.name;
    this.startAt = task.startAt;
    this.interval = task.interval;
    this.recurrent = task.recurrent;
    this.params = task.params;
    this.cancelEvent = task.cancelEvent;
  }

  nextRun(currentTime: number = now()): number {
    if (this.startAt !== -1 && currentTime < this.startAt) {
      return this.startAt - currentTime;
    }

    return this.interval - (currentTime - this.lastUpdate);
  }
}
