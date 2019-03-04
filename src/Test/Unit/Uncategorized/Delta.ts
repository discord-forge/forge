import {Unit, Test, Assert, Is} from "unit";
import Delta from "../../../State/Delta";

@Unit("Delta")
default class {
    @Test("should compare two objects")
    public compare() {
        const result: string[] = Delta.compare(
            {
                name: "john",
                age: 50
            },
            {
                name: "doe",
                age: 100
            }
        );

        Assert.that(result, Is.arrayWithLength(2));

        // Assert results.
        Assert.that(result[0], Is.string);
        Assert.that(result[1], Is.string);
    }
}
