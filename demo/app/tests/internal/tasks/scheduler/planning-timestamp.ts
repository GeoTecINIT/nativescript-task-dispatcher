import { planningTimestamp } from "nativescript-task-dispatcher/internal/tasks/scheduler/planning-timestamp";

const A_BIT = 100;

describe("Planning timestamp", () => {
    it("returns the planning timestamp of the current invocation in successive runs", async () => {
        planningTimestamp.updateCurrent();
        await aBit();
        for (let i = 0; i < 3; i++) {
            planningTimestamp.updateCurrent();
            const planTimestamp = planningTimestamp.previous;
            expect(isABitBehindNow(planTimestamp)).toBeTruthy();
            await aBit();
        }
    });
});

function aBit(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), A_BIT);
    });
}

function isABitBehindNow(timestamp: number) {
    const now = new Date().getTime();
    const offset = 25;

    return now - timestamp < A_BIT + offset && now - timestamp > A_BIT - offset;
}
