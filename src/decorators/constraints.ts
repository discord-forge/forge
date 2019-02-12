import {DecoratorUtils} from "./decorator-utils";
import {SpecificConstraints, IConstraints, RestrictGroup} from "../commands/command";
import ChatEnv from "../core/chat-env";
import {DecoratorProxy} from "./component";

export abstract class Constraint {
    /**
     * Restrict command execution to a certain environment.
     * @param {ChatEnv} env The command execution environment.
     */
    public static environment(env: ChatEnv): DecoratorProxy {
        return function (target: any) {
            DecoratorUtils.ensureFunc(target);

            return DecoratorUtils.overrideConstraint(target, "environment", env);
        };
    }

    /**
     * Rate-limit command execution per user.
     * @param {number} time The time between command executions in seconds.
     */
    public static cooldown(time: number): DecoratorProxy {
        return function (target: any) {
            DecoratorUtils.ensureFunc(target);

            return DecoratorUtils.overrideConstraint(target, "cooldown", time);
        };
    }

    /**
     * Disable a command and prevent execution.
     */
    public static disabled(target: any): DecoratorProxy {
        DecoratorUtils.ensureFunc(target);

        return class extends target {
            public readonly isEnabled: boolean = false;
        };
    }

    /**
     * Limit command execution to specific users, channels, or guilds.
     */
    public static specific(values: SpecificConstraints): DecoratorProxy {
        return function (target: any) {
            DecoratorUtils.ensureFunc(target);

            return DecoratorUtils.overrideConstraint(target, "specific", values);
        };
    }

    /**
     * Require certain permission(s) from the issuer.
     * @param {any[]} permissions The permission(s) required.
     */
    public static issuerPermissions(...permissions: any[]): DecoratorProxy {
        return function (target: any) {
            DecoratorUtils.ensureFunc(target);

            return DecoratorUtils.overrideConstraint(target, "issuerPermissions", permissions);
        };
    }

    /**
     * Require certain permission(s) from the bot.
     * @param {any[]} permissions The permission(s) required.
     */
    public static selfPermissions(...permissions: any[]): DecoratorProxy {
        return function (target: any) {
            DecoratorUtils.ensureFunc(target);

            return DecoratorUtils.overrideConstraint(target, "selfPermissions", permissions);
        };
    }

    /**
     * Limit the command to the bot owner only.
     */
    public static ownerOnly(target: any): DecoratorProxy {
        DecoratorUtils.ensureFunc(target);

        return class extends target {
            public readonly constraints: IConstraints = {
                ...this.constraints,

                specific: [
                    ...this.constraints.specific,
                    RestrictGroup.BotOwner
                ]
            };
        };
    }

}

export function constraints(values: Partial<IConstraints>): DecoratorProxy {
    return function (target: any) {
        DecoratorUtils.ensureFunc(target);

        return class extends target {
            public readonly constraints: IConstraints = {
                ...this.constraints,
                ...values
            };
        };
    };
}
