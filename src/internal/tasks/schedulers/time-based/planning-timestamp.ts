import {
  getNumber,
  setNumber,
  flush,
} from "tns-core-modules/application-settings/application-settings";
import { now } from "../../../utils/time";

const PREVIOUS_PLANNING_TIMESTAMP = "PREVIOUS_PLANNING_TIMESTAMP";
const CURRENT_PLANNING_TIMESTAMP = "CURRENT_PLANNING_TIMESTAMP";

class PlanningTimestamp {
  private _previous: number = getNumber(PREVIOUS_PLANNING_TIMESTAMP, -1);
  private _current: number = getNumber(CURRENT_PLANNING_TIMESTAMP, -1);

  get previous(): number {
    return this._previous;
  }

  get current(): number {
    return this._current;
  }

  updateCurrent(): void {
    const previousCurrent = this.current;
    const newCurrent = now();
    this._previous = previousCurrent;
    this._current = newCurrent;
    setNumber(PREVIOUS_PLANNING_TIMESTAMP, previousCurrent);
    setNumber(CURRENT_PLANNING_TIMESTAMP, newCurrent);
    flush();
  }
}

export const planningTimestamp = new PlanningTimestamp();
