import { NativeSQLite } from "@nano-sql/adapter-sqlite-nativescript";
import { nSQL } from "@nano-sql/core/lib/index";
import { PlannedTask, PlanningType } from "../tasks/planner/planned-task";
import { RunnableTask } from "../tasks/runnable-task";
import { now } from "../utils/time";

const DB_NAME = "tasks-dispatcher";
const PLANNED_TASKS_TABLE = "plannedTasks";

class PlannedTaskDBStore implements PlannedTasksStore {
  private dbInitialized: boolean = false;
  private createDBProcedure: Promise<void>;

  async insert(plannedTask: PlannedTask): Promise<void> {
    const {
      name,
      startAt,
      interval,
      recurrent,
      params,
      cancelEvent,
    } = plannedTask;

    const runnableTask: RunnableTask = {
      name,
      startAt,
      interval,
      recurrent,
      params,
      cancelEvent,
    };

    const possibleTask = await this.get(runnableTask);
    if (possibleTask) {
      throw new PlannedTaskAlreadyExistsError(plannedTask);
    }

    const instance = await this.db();
    await instance.query("upsert", { ...plannedTask }).exec();
  }

  async delete(taskId: string): Promise<void> {
    const instance = await this.db();
    await instance.query("delete").where(["id", "=", taskId]).exec();
  }

  async get(task: string | RunnableTask): Promise<PlannedTask> {
    let whereStatement: Array<any> = ["id", "=", task];
    if (typeof task !== "string") {
      const runnableTask = task as RunnableTask;
      whereStatement = [
        ["name", "=", runnableTask.name],
        "AND",
        ["startAt", "=", runnableTask.startAt],
        "AND",
        ["interval", "=", runnableTask.interval],
        "AND",
        ["recurrent", "=", runnableTask.recurrent],
      ];
    }

    const instance = await this.db();
    nSQL(PLANNED_TASKS_TABLE).useDatabase(DB_NAME); // <- "Dark sourcery" (TM)
    const rows = await instance.query("select").where(whereStatement).exec();
    if (rows.length === 0) {
      return null;
    }

    if (typeof task === "string") {
      return this.plannedTaskFromRow(rows[0]);
    }

    const params = JSON.stringify(task.params);
    for (let row of rows) {
      if (params === JSON.stringify(row.params)) {
        return this.plannedTaskFromRow(row);
      }
    }
    return null;
  }

  async getAllSortedByNextRun(
    planningType?: PlanningType
  ): Promise<Array<PlannedTask>> {
    const instance = await this.db();
    let query = instance.query("select");
    if (planningType) {
      query = query.where(["planningType", "=", planningType]);
    }

    const rows = await query.exec();
    const plannedTasks = rows.map((row) => this.plannedTaskFromRow(row));
    const currentMillis = now();

    return plannedTasks.sort(
      (t1, t2) => t1.nextRun(currentMillis) - t2.nextRun(currentMillis)
    );
  }

  async getAllCancelEvents(): Promise<Array<string>> {
    const instance = await this.db();
    const rows = await instance
      .query("select")
      .distinct(["cancelEvent"])
      .exec();

    return rows.map((row) => row.cancelEvent);
  }

  async getAllFilteredByCancelEvent(
    cancelEvent: string
  ): Promise<Array<PlannedTask>> {
    const instance = await this.db();
    const rows = await instance
      .query("select")
      .where(["cancelEvent", "=", cancelEvent])
      .exec();

    return rows.map((row) => this.plannedTaskFromRow(row));
  }

  async increaseErrorCount(taskId: string): Promise<void> {
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      const instance = await this.db(`${PLANNED_TASKS_TABLE}.errorCount`);
      await instance
        .query("upsert", plannedTask.errorCount + 1)
        .where(["id", "=", taskId])
        .exec();
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async increaseTimeoutCount(taskId: string): Promise<void> {
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      const instance = await this.db(`${PLANNED_TASKS_TABLE}.timeoutCount`);
      await instance
        .query("upsert", plannedTask.timeoutCount + 1)
        .where(["id", "=", taskId])
        .exec();
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async updateLastRun(taskId: string, timestamp: number): Promise<void> {
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      const instance = await this.db(`${PLANNED_TASKS_TABLE}.lastRun`);
      await instance
        .query("upsert", timestamp)
        .where(["id", "=", taskId])
        .exec();
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async deleteAll(): Promise<void> {
    const instance = await this.db();
    await instance.query("delete").exec();
  }

  private async db(tableName = PLANNED_TASKS_TABLE) {
    await this.createDB();
    if (nSQL().selectedDB !== DB_NAME) {
      nSQL().useDatabase(DB_NAME);
    }
    return nSQL(tableName);
  }

  // TODO: Extract to an isolated class
  private async createDB() {
    if (this.dbInitialized) {
      return;
    }
    if (!this.createDBProcedure) {
      this.createDBProcedure = nSQL().createDatabase({
        id: DB_NAME,
        mode: new NativeSQLite(),
        tables: [
          {
            name: PLANNED_TASKS_TABLE,
            model: {
              "id:uuid": { pk: true },
              "planningType:string": {},
              "schedulerType:string": {},
              "name:string": {},
              "startAt:int": {},
              "params:obj": {},
              "interval:int": {},
              "recurrent:boolean": {},
              "createdAt:int": {},
              "errorCount:int": {},
              "timeoutCount:int": {},
              "lastRun:int": {},
              "cancelEvent:string": {},
            },
          },
        ],
      });
    }
    await this.createDBProcedure;
    this.dbInitialized = true;
  }

  private plannedTaskFromRow(obj: any) {
    return new PlannedTask(
      obj.planningType,
      obj.schedulerType,
      {
        name: obj.name,
        startAt: obj.startAt,
        interval: obj.interval,
        recurrent: obj.recurrent,
        params: obj.params,
        cancelEvent: obj.cancelEvent,
      },
      obj.id,
      obj.createdAt,
      obj.lastRun,
      obj.errorCount,
      obj.timeoutCount
    );
  }
}

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

export const plannedTasksDB = new PlannedTaskDBStore();

// tslint:disable-next-line:max-classes-per-file
export class PlannedTaskAlreadyExistsError extends Error {
  constructor({ name, startAt, interval, recurrent }: PlannedTask) {
    super(
      `Already stored: {name=${name}, startAt=${startAt}, interval=${interval}, recurrent=${recurrent}}`
    );
  }
}
