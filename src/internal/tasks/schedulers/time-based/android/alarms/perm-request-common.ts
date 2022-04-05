import { Application } from "@nativescript/core";
import { AndroidApplication } from "@nativescript/core";

export function waitForActivityResume(): Promise<void> {
  return new Promise<void>((resolve) => {
    const resumeHandler = () => {
      Application.android.off(
        AndroidApplication.activityResumedEvent,
        resumeHandler
      );
      resolve();
    };

    Application.android.on(
      AndroidApplication.activityResumedEvent,
      resumeHandler
    );
  });
}

export function fireInMs(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
