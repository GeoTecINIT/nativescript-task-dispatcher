import { now } from "../../utils/time";

class LastRecurrentRun {
  private lastRun: number;

  updateLast() {
    this.lastRun = now();
  }

  timeSince() {
    if (typeof this.lastRun === "undefined") {
      return 0;
    }
    return now() - this.lastRun;
  }
}

export const lastRecurrentRun = new LastRecurrentRun();
