import Command, {IConstraints} from "../commands/command";
import {IFragmentMeta} from "../fragments/fragment";
import Log from "../logging/log";

/**
 * Static utility class for decorators.
 */
export abstract class DecoratorUtils {
    // TODO: Attempt to merge override methods
    // TODO: Should append instead of override?
    public static overrideConstraint(target: any, constraint: string, value: any): any {
        return class extends target {
            public readonly constraints: IConstraints = {
                ...this.constraints,
                [constraint]: value
            };
        };
    }

    public static overrideMeta(target: any, meta: string, value: any): any {
        return class extends target {
            public readonly meta: IFragmentMeta = {
                ...this.meta,
                [meta]: value
            };
        };
    }

    /**
     * Ensure input is a function, otherwise throw an error.
     * @param {*} target
     */
    public static ensureFunc(target: any): void {
        if (typeof target !== "function") {
            throw Log.error("Expecting target to be a function");
        }
    }

    /**
     * Ensure input is an object, otherwise throw an error.
     * @param {*} target
     */
    public static ensureObj(target: any): void {
        if (typeof target !== "object") {
            throw Log.error("Expecting target to be an object");
        }
    }

    /**
     * Extract all methods from a class into an array.
     * @param {*} source
     * @param {string[]} keys
     */
    public static extractMethods<T = any>(source: any, keys: string[]): T[] {
        const result: T[] = [];

        for (const key of keys) {
            if (typeof source[key] !== "function") {
                throw Log.error("Expecting source's property to be a method");
            }

            result.push(source[key]);
        }

        return result;
    }

    /**
     * Ensure input is a function and create an instance of it.
     * @param target
     */
    public static createInstance<T = Command>(target: any): T {
        DecoratorUtils.ensureFunc(target);

        return new target();
    }
}
