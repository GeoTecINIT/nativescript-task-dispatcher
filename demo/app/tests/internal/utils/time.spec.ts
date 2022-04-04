import { now } from "nativescript-task-dispatcher/internal/utils/time";

describe("Time utils", () => {
    it("allows to obtain the native current time in milliseconds", () => {
        expect(bothAreClose(now(), Date.now())).toBeTrue();
    });
});

function bothAreClose(num1: number, num2: number): boolean {
    const diff = Math.abs(num1 - num2);
    return diff < 10;
}
