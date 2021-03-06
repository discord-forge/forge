import {Message} from "discord.js";
import {EventEmitter} from "events";
import Bot from "./bot";
import {IDisposable} from "../util/helpers";
import Log from "./log";

export enum PaginationEvent {
    PageChanged = "pageChanged"
}

// TODO: Implement break lines code.
export default class PaginatedMessage extends EventEmitter implements IDisposable {
    public readonly content: string;
    public readonly maxLength: number;
    public readonly breakLines: boolean;

    protected current: number;

    public constructor(content: string, maxLength: number = 2000, breakLines: boolean = true, currentPage: number = 0) {
        super();

        this.content = content;
        this.maxLength = maxLength;
        this.breakLines = breakLines;
        this.current = currentPage;
    }

    /**
     * Cycle pages.
     */
    public next(pages: number = 1): this {
        if (this.current + pages >= 0 && this.current + pages <= this.maxPages) {
            this.current += pages;
            this.emit(PaginationEvent.PageChanged, this.current);
        }

        return this;
    }

    /**
     * The maximum amount of pages.
     */
    public get maxPages(): number {
        if (this.content.length > this.maxLength) {
            return 1;
        }

        return this.content.length / this.maxLength;
    }

    public attach(bot: Bot, message: Message, placeholder: string = "*"): this {
        if (message.author.id !== bot.client.user.id) {
            Log.warn("Refusing to attach to foreign message");

            return this;
        }

        this.on(PaginationEvent.PageChanged, async () => {
            if (!message.editable) {
                Log.warn("Message is un-editable");

                return;
            }

            await message.edit(placeholder === "*" ? this.getPage() : message.content.replace(placeholder, this.getPage));
        });

        return this;
    }

    public dispose(): this {
        // TODO: Implement.

        throw Log.notImplemented;
    }

    public previous(pages: number = 1): this {
        return this.next(pages * -1);
    }

    public get currentPage(): number {
        return this.current + 1;
    }

    public getPage(): string {
        return this.content.substring(this.current * this.maxLength, (this.current * this.maxLength) + this.maxLength);
    }
}
