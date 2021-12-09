import { ApplicationSettings } from "@nativescript/core";
import { now } from "../../../utils/time";

const PLANNING_TIMESTAMPS = "PLANNING_TIMESTAMPS";

class PlanningTimestamp {
  private _previous: number;
  private _current: number;

  constructor() {
    const timestamps = this.getTimestamps();
    this._previous = timestamps.previous;
    this._current = timestamps.current;
  }

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
    this.setTimestamps({ previous: this.previous, current: this.current });
  }

  private getTimestamps(): Timestamps {
    const stringifiedTimestamps = ApplicationSettings.getString(PLANNING_TIMESTAMPS, undefined);

    if (!stringifiedTimestamps) {
      return {
        previous: -1,
        current: -1
      };
    }

    return JSON.parse(stringifiedTimestamps);
  }

  private setTimestamps(timestamps: Timestamps): void {
    const stringifiedTimestamps = JSON.stringify(timestamps);

    ApplicationSettings.setString(PLANNING_TIMESTAMPS, stringifiedTimestamps);
    ApplicationSettings.flush();
  }
}

interface Timestamps {
  previous: number;
  current: number;
}

export const planningTimestamp = new PlanningTimestamp();
