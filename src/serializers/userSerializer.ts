import {Collection, Snowflake, User} from "discord.js";
import Pattern from "../core/pattern";
import {ISerializer} from "./serializer";

export default class UserSerializer<T extends User = User> implements ISerializer<T> {
    protected readonly source: Collection<Snowflake, T>;

    public constructor(source: Collection<Snowflake, T>) {
        this.source = source;
    }

    public serialize(data: T): string {
        return data.toString();
    }

    public deserialize(serializedData: string): T | null {
        if (!Pattern.mention.test(serializedData)) {
            return null;
        }

        return this.source.get(serializedData) || null;
    }
}
