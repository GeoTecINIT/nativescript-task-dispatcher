import { toSeconds } from "nativescript-task-dispatcher/internal/utils/time-converter";

describe("Time converter", () => {
    it("should convert seconds to seconds", () => {
        const result = toSeconds(60, "seconds");
        expect(result).toEqual(60);
    });

    it("should convert minutes to seconds", () => {
        const result = toSeconds(2, "minutes");
        expect(result).toEqual(120);
    });

    it("should convert hours to seconds", () => {
        const result = toSeconds(8, "hours");
        expect(result).toEqual(28800);
    });

    it("should convert days to seconds", () => {
        const result = toSeconds(7, "days");
        expect(result).toEqual(604800);
    });
});
