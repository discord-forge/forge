import {default as Command} from "../../commands/command";
import Context from "../../commands/context";
import {name, desc, args} from "../../decorators/general";
import MsgBuilder from "../../builders/msgBuilder";
import {Constraint} from "../../decorators/constraint";
import {type} from "../../commands/type";

type Args = {
    readonly command: string;
};

const delimiter: string = ", ";

@name("usage")
@desc("View the usage of a command")
@args({
    name: "command",
    type: type.string,
    required: true,
    desc: "The command to inspect"
})
@Constraint.cooldown(1)
export default class extends Command<Args> {
    // TODO: Finish implementing.
    public async run($: Context, arg: Args) {
        const targetCommand: Command | null = await $.bot.registry.get(arg.command);

        if (!targetCommand) {
            await $.fail("That command doesn't exist.");

            return;
        }

        const usage: MsgBuilder = new MsgBuilder().block().append(`# Usage\n${targetCommand.meta.name}`);

        for (const argument of targetCommand.args) {
            usage.append(" ").append(argument.required ? argument.name : `[${argument.name}]`);
        }

        const dependencies: string = targetCommand.dependsOn.length > 0 ? targetCommand.dependsOn.join(delimiter) : "None";
        const cooldown: string = targetCommand.constraints.cooldown !== 0 ? `${targetCommand.constraints.cooldown} second(s)` : "None";
        const aliases: string = targetCommand.aliases.length > 0 ? targetCommand.aliases.join(delimiter) : "None";

        const additional: string[] = [];

        if (!targetCommand.isEnabled) {
            additional.push("Disabled");
        }

        if (targetCommand.undoable) {
            additional.push("Undo-able");
        }

        if (targetCommand.singleArg) {
            additional.push("Single-argument");
        }

        usage.line()
            .add(`# Name\n${targetCommand.meta.name}`)
            .line()
            .add(`# Description\n${targetCommand.meta.description}`)
            .line()
            .add(`# Aliases\n${aliases}`)
            .line()
            .add(`# Dependencies\n${dependencies}`)
            .line()
            .add(`# Cooldown\n${cooldown}`)
            .line()
            .add(`# Additional notes\n${additional.join(delimiter)}`);

        if (targetCommand.args.length > 0) {
            usage.line()
                .add("# Argument details\n")
                .line();

            for (const argument of targetCommand.args) {
                const def: string = argument.defaultValue ? ` (default: '${argument.defaultValue}')` : "";
                const flag: string = argument.flagShortName ? ` {-${argument.flagShortName}}` : "";

                // TODO: Missing argument's type
                usage.add(`${argument.name}${argument.required ? "!" : "?"}${flag}${def} : ${argument.desc}`);
            }
        }

        await $.send(usage.block().build());
    }
}
