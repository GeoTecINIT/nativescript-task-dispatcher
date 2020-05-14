import { planningTimestamp } from "nativescript-task-dispatcher/internal/tasks/schedulers/time-based/planning-timestamp";

const A_BIT = 500;
const ATTEMPTS = 3;

describe("Planning timestamp", () => {
    it("returns the planning timestamp of the current invocation in successive runs", async () => {
        planningTimestamp.updateCurrent();
        await aBit();
        for (let i = 0; i <= ATTEMPTS; i++) {
            planningTimestamp.updateCurrent();
            const previous = planningTimestamp.previous;
            const current = planningTimestamp.current;
            console.log(
                `Previous=${planningTimestamp.previous}, Current=${
                    planningTimestamp.current
                }, Diff=${
                    planningTimestamp.current - planningTimestamp.previous
                }`
            );
            expect(isABitBehind(previous, current)).toBeTruthy();
            await aBit();
        }
    });
});

function aBit(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), A_BIT);
    });
}

function isABitBehind(previous: number, current: number) {
    const offset = A_BIT / 2;

    return current - previous < A_BIT + offset;
}
