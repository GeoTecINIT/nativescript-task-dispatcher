import { ApplicationSettings } from "@nativescript/core";
import { now } from "../../../utils/time";

const PREVIOUS_PLANNING_TIMESTAMP = "PREVIOUS_PLANNING_TIMESTAMP";
const CURRENT_PLANNING_TIMESTAMP = "CURRENT_PLANNING_TIMESTAMP";

class PlanningTimestamp {
  private _previous: number = this.getNumber(
    PREVIOUS_PLANNING_TIMESTAMP,
    -1
  );
  private _current: number = this.getNumber(
    CURRENT_PLANNING_TIMESTAMP,
    -1
  );

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
    this.setNumber(PREVIOUS_PLANNING_TIMESTAMP, previousCurrent);
    this.setNumber(CURRENT_PLANNING_TIMESTAMP, newCurrent);
  }

  private getNumber(key: string, defaultValue: number): number {
    const stringValue = ApplicationSettings.getString(key, null);

    return stringValue !== null ? parseInt(stringValue) : defaultValue;
  }

  private setNumber(key: string, value: number): void {
    ApplicationSettings.setString(key, value.toString());
    ApplicationSettings.flush();
  }
}

export const planningTimestamp = new PlanningTimestamp();
