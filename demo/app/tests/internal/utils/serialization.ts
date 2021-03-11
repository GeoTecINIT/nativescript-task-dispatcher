import {
    serialize,
    deserialize,
    flatten,
} from "nativescript-task-dispatcher/internal/utils/serialization";

class Flattenable {
    constructor(
        public attr1: number,
        public attr2: string,
        public attr3: Date,
        public attr4: Array<InnerFlattenable>
    ) {}

    methodToDiscard() {
        return "Meant to be discarded";
    }
}

interface InnerFlattenable {
    sAttr1: string;
    sAttr2: InnerFlattenableOption;
}

enum InnerFlattenableOption {
    NO_CHOICE = "no-choice",
    CHOICE = "choice",
}

describe("Serialization toolkit", () => {
    const plainObject = {
        attr1: 0,
        attr2: "string",
        attr3: new Date(),
        attr4: [
            {
                sAttr1: 1,
                sAttr2: "another string",
                sAttr3: new Date(Date.now() + 60000),
            },
            {
                sAttr1: 2,
                sAttr2: "yet another string",
                sAttr3: new Date(Date.now() + 120000),
            },
        ],
        attr5: undefined,
    };

    const complexObject = new Flattenable(
        0,
        "string",
        new Date(1664575200000),
        [
            { sAttr1: "another string", sAttr2: InnerFlattenableOption.CHOICE },
            {
                sAttr1: "yet another string",
                sAttr2: InnerFlattenableOption.NO_CHOICE,
            },
        ]
    );

    const expectedPlainObject = {
        attr1: 0,
        attr2: "string",
        attr3: new Date(1664575200000),
        attr4: [
            { sAttr1: "another string", sAttr2: InnerFlattenableOption.CHOICE },
            {
                sAttr1: "yet another string",
                sAttr2: InnerFlattenableOption.NO_CHOICE,
            },
        ],
    };

    it("serializes data as a string", () => {
        const serializedData = serialize(plainObject);
        expect(serializedData).toEqual(jasmine.any(String));
    });

    it("reconstructs a plain object from a string", () => {
        const serializedData = serialize(plainObject);
        const deserializedData = deserialize(serializedData);
        expect(deserializedData).toEqual(plainObject);
    });

    it("turns a complex object into a plain JavaScript object (flatten)", () => {
        const plainObject = flatten(complexObject);
        expect(plainObject).toEqual(expectedPlainObject);
    });

    it("turns an array of complex objects into an array of plan JavaScript objects (flatten array)", () => {
        const plainArray = flatten([complexObject, complexObject]);
        expect(plainArray).toEqual([expectedPlainObject, expectedPlainObject]);
    });
});
