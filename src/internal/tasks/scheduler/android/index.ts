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
    if (time < 1) {
      throw new Error(
        `Scheduled tasks cannot run in less than 1 second intervals. Use an immediate task instead.

        Keep in mind that recurrent immediate tasks are hard to implement and strongly discouraged.`
      );
    }
    if (time >= 1 && time < toSeconds(1, "minutes")) {
      throw new Error(
        `Running tasks with intervals ranging from 1 to 60 seconds is a foreseen feature and will be implemented in the future.

        Keep in mind that executing this kind of tasks in a sustained way will drain system resources. Use them responsibly.`
      );
    } else {
      return this.alarmScheduler.schedule(taskToSchedule);
    }
  }

  async cancel(plannedTaskId: string): Promise<void> {
    const task = await this.tasksStore.get(plannedTaskId);
    switch (task.planningType) {
      case PlanningType.Scheduled:
        return this.alarmScheduler.cancel(plannedTaskId);
      default:
        throw new Error("Method not implemented.");
    }
  }
}
