import {Coordinator} from "../automation/coordinator";
import {Log, LogLevel, Utils} from "..";
import FileSystemOperations from "../automation/predefied-ops/file-system";
import ScriptOperations from "../automation/predefied-ops/scripts";

enum BuildMode {
    Default
}

Log.hiddenItems = true;
Log.level = LogLevel.Debug;

const coordinator: Coordinator = new Coordinator();
const mode: BuildMode = BuildMode.Default;
const buildDir: string = "./dist";

async function build(): Promise<number> {
    const result = await coordinator
        .then(() => {
            Log.verbose("Building project");
            Log.verbose(`Using mode: ${BuildMode[mode].toString().toLowerCase()}`)
        })

        .then(() => FileSystemOperations.forceRemove(buildDir))
        .then(() => ScriptOperations.execute("tsc"))

        .run();

    const time: string = Utils.spreadTime(result.time);
    const avgTime: string = Utils.spreadTime(result.averageTime);

    Log.verbose(`Operation completed | Took ${time}ms (${avgTime}ms avg.) | ${result.operationsCompleted/result.operations} operations`);

    return result.operations === result.operationsCompleted ? 0 : 1;
}

build().then((code: number) => process.exit(code));