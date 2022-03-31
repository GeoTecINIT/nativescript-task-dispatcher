import { PlannedTask, PlanningType } from "../tasks/planner/planned-task";
import { RunnableTask } from "../tasks/runnable-task";
import {
  CouchBase,
  QueryLogicalOperator,
  QueryMeta,
} from "@triniwiz/nativescript-couchbase";
import { now } from "../utils/time";

const DB_NAME = "task-dispatcher";
const DOC_TYPE = "planned-task";

export interface PlannedTasksStore {
  insert(plannedTask: PlannedTask): Promise<void>;
  delete(taskId: string): Promise<void>;
  get(task: RunnableTask | string): Promise<PlannedTask>;
  getAllSortedByNextRun(
    planningType: PlanningType
  ): Promise<Array<PlannedTask>>;
  getAllCancelEvents(): Promise<Array<string>>;
  getAllFilteredByCancelEvent(cancelEvent: string): Promise<Array<PlannedTask>>;
  increaseErrorCount(taskId: string): Promise<void>;
  increaseTimeoutCount(taskId: string): Promise<void>;
  updateLastRun(taskId: string, timestamp: number): Promise<void>;
}

class PlannedTaskDBStore implements PlannedTasksStore {
  private readonly database: CouchBase;

  constructor() {
    this.database = new CouchBase(DB_NAME);
  }

  async insert(plannedTask: PlannedTask): Promise<void> {
    const runnableTask = runnableTaskFrom(plannedTask);

    const possibleTask = await this.get(runnableTask);
    if (possibleTask) {
      throw new PlannedTaskAlreadyExistsError(plannedTask);
    }

    let doc = documentFrom(plannedTask);
    this.database.createDocument(doc, plannedTask.id);
  }

  async delete(taskId: string): Promise<void> {
    this.database.deleteDocument(taskId);
  }

  async get(task: string | RunnableTask): Promise<PlannedTask> {
    if (typeof task === "string") {
      const doc = this.database.getDocument(task);
      return doc ? plannedTaskFrom(doc) : null;
    }

    const { name, startAt, interval, recurrent } = task;
    const docs = this.database.query({
      select: [],
      where: [
        { property: "name", comparison: "equalTo", value: name },
        {
          logical: QueryLogicalOperator.AND,
          property: "startAt",
          comparison: "equalTo",
          value: startAt,
        },
        {
          logical: QueryLogicalOperator.AND,
          property: "interval",
          comparison: "equalTo",
          value: interval,
        },
        {
          logical: QueryLogicalOperator.AND,
          property: "recurrent",
          comparison: "equalTo",
          value: recurrent,
        },
      ],
    });

    if (docs.length === 0) {
      return null;
    }

    const params = JSON.stringify(task.params);
    for (let doc of docs) {
      if (params === JSON.stringify(doc.params)) {
        return plannedTaskFrom(doc);
      }
    }
    return null;
  }

  async getAllSortedByNextRun(
    planningType?: PlanningType
  ): Promise<Array<PlannedTask>> {
    const docs = this.database.query({
      select: [],
      where: planningType
        ? [
            {
              property: "planningType",
              comparison: "equalTo",
              value: planningType,
            },
          ]
        : undefined,
    });

    const plannedTasks = docs.map((doc) => plannedTaskFrom(doc));
    const currentMillis = now();

    return plannedTasks.sort(
      (t1, t2) => t1.nextRun(currentMillis) - t2.nextRun(currentMillis)
    );
  }

  async getAllCancelEvents(): Promise<Array<string>> {
    const docs = this.database.query({ select: ["cancelEvent"] });

    const cancelEvents = docs.map((doc) => doc.cancelEvent);
    const cancelEventSet = new Set<string>(cancelEvents);
    return [...cancelEventSet];
  }

  async getAllFilteredByCancelEvent(
    cancelEvent: string
  ): Promise<Array<PlannedTask>> {
    const docs = this.database.query({
      select: [],
      where: [
        { property: "cancelEvent", comparison: "equalTo", value: cancelEvent },
      ],
    });

    return docs.map((doc) => plannedTaskFrom(doc));
  }

  async increaseErrorCount(taskId: string): Promise<void> {
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      this.database.updateDocument(taskId, {
        errorCount: plannedTask.errorCount + 1,
      });
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async increaseTimeoutCount(taskId: string): Promise<void> {
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      this.database.updateDocument(taskId, {
        timeoutCount: plannedTask.timeoutCount + 1,
      });
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async updateLastRun(taskId: string, timestamp: number): Promise<void> {
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      this.database.updateDocument(taskId, {
        lastRun: timestamp,
      });
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  deleteAll(): Promise<void> {
    return new Promise((resolve) => {
      const docs = this.database.query({ select: [QueryMeta.ID] });
      for (let doc of docs) {
        this.database.deleteDocument(doc.id);
      }
      resolve();
    });
  }
}

function runnableTaskFrom(plannedTask: PlannedTask): RunnableTask {
  const { name, startAt, interval, recurrent, params, cancelEvent } =
    plannedTask;

  return {
    name,
    startAt,
    interval,
    recurrent,
    params,
    cancelEvent,
  };
}

function documentFrom(plannedTask: PlannedTask): any {
  const runnableTask = runnableTaskFrom(plannedTask);
  const {
    planningType,
    schedulerType,
    createdAt,
    lastRun,
    errorCount,
    timeoutCount,
  } = plannedTask;

  return {
    docType: DOC_TYPE,
    ...runnableTask,
    planningType,
    schedulerType,
    createdAt,
    lastRun,
    errorCount,
    timeoutCount,
  };
}

function plannedTaskFrom(doc: any) {
  return new PlannedTask(
    doc.planningType,
    doc.schedulerType,
    {
      name: doc.name,
      startAt: doc.startAt,
      interval: doc.interval,
      recurrent: doc.recurrent,
      params: doc.params,
      cancelEvent: doc.cancelEvent,
    },
    doc.id,
    doc.createdAt,
    doc.lastRun,
    doc.errorCount,
    doc.timeoutCount
  );
}

export const plannedTasksDB = new PlannedTaskDBStore();

// tslint:disable-next-line:max-classes-per-file
export class PlannedTaskAlreadyExistsError extends Error {
  constructor({ name, startAt, interval, recurrent }: PlannedTask) {
    super(
      `Already stored: {name=${name}, startAt=${startAt}, interval=${interval}, recurrent=${recurrent}}`
    );
  }
}
