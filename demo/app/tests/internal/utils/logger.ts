import {
    getLogger,
    enableLogging,
    disableLogging,
} from "nativescript-task-dispatcher/internal/utils/logger";
import { DevLogger } from "nativescript-task-dispatcher/internal/utils/logger/dev";
import { ProdLogger } from "nativescript-task-dispatcher/internal/utils/logger/prod";

describe("Get logger", () => {
    it("returns a development logger when loging is enabled", () => {
        enableLogging();
        const logger = getLogger("SomeTag");
        expect(logger instanceof DevLogger).toBeTruthy();
    });

    it("returns a production logger while in production", () => {
        disableLogging();
        const logger = getLogger("SomeTag");
        expect(logger instanceof ProdLogger).toBeTruthy();
    });

    afterEach(() => {
        enableLogging();
    });
});
