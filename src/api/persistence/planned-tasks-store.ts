import { NativeSQLite } from '@nano-sql/adapter-sqlite-nativescript';
import { nSQL } from '@nano-sql/core/lib/index';
import { PlannedTask, PlanningType } from '../tasks/planner/planned-task';
import { RunnableTask } from '../tasks/runnable-task';

const DB_NAME = 'symptoms-mobile';
const PLANNED_TASKS_TABLE = 'plannedTasks';

class PlannedTaskDBStore implements PlannedTasksStore {
  private dbInitialized: boolean = false;
  private createDBProcedure: Promise<void>;

  async insert(plannedTask: PlannedTask): Promise<void> {
    await this.createDB();

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

    await nSQL(PLANNED_TASKS_TABLE)
      .query('upsert', { ...plannedTask })
      .exec();
  }

  async delete(taskId: string): Promise<void> {
    await this.createDB();
    await nSQL(PLANNED_TASKS_TABLE)
      .query('delete')
      .where(['id', '=', taskId])
      .exec();
  }

  async get(task: string | RunnableTask): Promise<PlannedTask> {
    await this.createDB();

    let whereStatement: Array<any> = ['id', '=', task];
    if (typeof task !== 'string') {
      const runnableTask = task as RunnableTask;
      whereStatement = [
        ['name', '=', runnableTask.name],
        'AND',
        ['startAt', '=', runnableTask.startAt],
        'AND',
        ['interval', '=', runnableTask.interval],
        'AND',
        ['recurrent', '=', runnableTask.recurrent],
      ];
    }

    const rows = await nSQL(PLANNED_TASKS_TABLE)
      .query('select')
      .where(whereStatement)
      .exec();
    if (rows.length === 0) {
      return null;
    }

    return this.plannedTaskFromRow(rows[0]);
  }

  async getAllSortedByNextRun(
    planningType?: PlanningType
  ): Promise<Array<PlannedTask>> {
    await this.createDB();

    let query = nSQL(PLANNED_TASKS_TABLE).query('select');
    if (planningType) {
      query = query.where(['planningType', '=', planningType]);
    }

    const rows = await query.exec();
    const plannedTasks = rows.map((row) => this.plannedTaskFromRow(row));
    const now = new Date().getTime();

    return plannedTasks.sort((t1, t2) => t1.nextRun(now) - t2.nextRun(now));
  }

  async getAllCancelEvents(): Promise<Array<string>> {
    await this.createDB();

    const rows = await nSQL(PLANNED_TASKS_TABLE)
      .query('select')
      .distinct(['cancelEvent'])
      .exec();

    return rows.map((row) => row.cancelEvent);
  }

  async getAllFilteredByCancelEvent(
    cancelEvent: string
  ): Promise<Array<PlannedTask>> {
    await this.createDB();
    const rows = await nSQL(PLANNED_TASKS_TABLE)
      .query('select')
      .where(['cancelEvent', '=', cancelEvent])
      .exec();

    return rows.map((row) => this.plannedTaskFromRow(row));
  }

  async increaseErrorCount(taskId: string): Promise<void> {
    await this.createDB();
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      await nSQL(`${PLANNED_TASKS_TABLE}.errorCount`)
        .query('upsert', plannedTask.errorCount + 1)
        .where(['id', '=', taskId])
        .exec();
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async increaseTimeoutCount(taskId: string): Promise<void> {
    await this.createDB();
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      await nSQL(`${PLANNED_TASKS_TABLE}.timeoutCount`)
        .query('upsert', plannedTask.timeoutCount + 1)
        .where(['id', '=', taskId])
        .exec();
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async updateLastRun(taskId: string, timestamp: number): Promise<void> {
    await this.createDB();
    const plannedTask = await this.get(taskId);

    if (plannedTask) {
      await nSQL(`${PLANNED_TASKS_TABLE}.lastRun`)
        .query('upsert', timestamp)
        .where(['id', '=', taskId])
        .exec();
    } else {
      throw new Error(`Task not found: ${taskId}`);
    }
  }

  async deleteAll(): Promise<void> {
    await this.createDB();
    await nSQL(PLANNED_TASKS_TABLE).query('delete').exec();
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
              'id:uuid': { pk: true },
              'planningType:string': {},
              'name:string': {},
              'startAt:int': {},
              'params:obj': {},
              'interval:int': {},
              'recurrent:boolean': {},
              'createdAt:int': {},
              'errorCount:int': {},
              'timeoutCount:int': {},
              'lastRun:int': {},
              'cancelEvent:string': {},
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
