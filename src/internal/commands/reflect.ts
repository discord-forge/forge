import {ActionType, IAction} from "../../actions/action";
import MsgBuilder from "../../builders/msg-builder";
import Command from "../../commands/command";
import Context from "../../commands/command-context";
import {Name, Description, Arguments} from "../../decorators/general";
import {Constraint} from "../../decorators/constraints";
import {IMessageActionArgs} from "../../actions/action-interpreter";
import Service from "../../services/service";
import {Type} from "../../commands/type";

interface IArgs {
    readonly type: ReflectDataType;
}

enum ReflectDataType {
    Services = "services"
}

@Name("reflect")
@Description("Access the bot's internal state")
@Arguments(
    {
        name: "type",
        description: "The data to inspect",
        required: true,
        switchShortName: "t",
        type: Type.String
    }
)
@Constraint.Cooldown(1)
@Constraint.OwnerOnly
export default class extends Command {
    public run($: Context, args: IArgs): IAction<IMessageActionArgs> {
        switch (args.type) {
            case ReflectDataType.Services: {
                let services: string = "";

                for (const [name, service] of $.bot.services.getAll()) {
                    if (service instanceof Service) {
                        services += `${service.running ? "+" : "-"} ${service.meta.name}\n\t${service.meta.description}\n`;
                    }
                }

                const result: string = new MsgBuilder()
                    .block("diff")
                    .append(services)
                    .block()
                    .build();

                return {
                    type: ActionType.Message,

                    args: {
                        channelId: $.c.id,
                        message: result
                    }
                };
            }

            default: {
                return {
                    type: ActionType.Message,

                    args: {
                        channelId: $.c.id,
                        message: "Invalid type provided"
                    }
                };
            }
        }
    }
}