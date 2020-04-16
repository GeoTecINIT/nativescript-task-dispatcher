import {
  getNumber,
  setNumber,
} from "tns-core-modules/application-settings/application-settings";

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
    this.setPrevious(this.current);
    this.setCurrent(new Date().getTime());
  }

  private setPrevious(value: number) {
    this._previous = value;
    setNumber(PREVIOUS_PLANNING_TIMESTAMP, value);
  }

  private setCurrent(value: number) {
    this._current = value;
    setNumber(CURRENT_PLANNING_TIMESTAMP, value);
  }
}

export const planningTimestamp = new PlanningTimestamp();
