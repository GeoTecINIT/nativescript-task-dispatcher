import { TaskScheduler } from "..";
import { RunnableTask } from "../../runnable-task";
import { PlannedTask, PlanningType } from "../../planner/planned-task";
import { AndroidAlarmScheduler } from "./alarms/alarm/scheduler.android";
import {
  plannedTasksDB,
  PlannedTasksStore,
} from "../../../persistence/planned-tasks-store";
import { checkIfTaskExists } from "../../provider";
import { toSeconds } from "../../../utils/time-converter";

export class AndroidTaskScheduler implements TaskScheduler {
  constructor(
    private alarmScheduler = new AndroidAlarmScheduler(),
    private tasksStore: PlannedTasksStore = plannedTasksDB
  ) {}

  async schedule(task: RunnableTask): Promise<PlannedTask> {
    checkIfTaskExists(task.name);

    const time = task.interval;
    const taskToSchedule = { ...task, interval: time * 1000 };
    if (time >= 5 && time < toSeconds(1, "minutes")) {
      throw new Error("Not implemented yet");
    } else {
      return this.alarmScheduler.schedule(taskToSchedule);
    }
  }

  async cancel(plannedTaskId: string): Promise<void> {
    const task = await this.tasksStore.get(plannedTaskId);
    switch (task.planningType) {
      case PlanningType.Alarm:
        return this.alarmScheduler.cancel(plannedTaskId);
      default:
        throw new Error("Method not implemented.");
    }
  }
}
