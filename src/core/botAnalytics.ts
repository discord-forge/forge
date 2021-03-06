/**
 * Recorded stats.
 */
export interface IBotStats {
    /**
     * The amount of commands intercepted
     * and handled by the command handler.
     */
    commandsHandled: number;

    /**
     * The amount of commands that failed to be executed.
     */
    commandsFailed: number;

    /**
     * The amount of messages that the bot has seen
     * in the current session.
     */
    messagesSeen: number;

    /**
     * The average amount of handled messages per minute (MPM).
     */
    avgMPM: number;

    /**
     * The average amount of handled commands per minute (CPM).
     */
    avgCPM: number;

    /**
     * The average amount of failed commands per minute (CFP).
     */
    avgCFP: number;
}

export type ReadonlyBotStats = Readonly<IBotStats>;

const DefaultBotStats: IBotStats = {
    commandsFailed: 0,
    commandsHandled: 0,
    messagesSeen: 0,
    avgCFP: 0,
    avgCPM: 0,
    avgMPM: 0
};

export interface IBotAnalytics {
    readonly stats: IBotStats;

    reset(): this;
    getAsReadonly(): ReadonlyBotStats;
}

/**
 * Allows detailed tracking of statistics and
 * interactions of the bot.
 */
export default class BotAnalytics implements IBotAnalytics {
    public stats: IBotStats;

    public constructor() {
        this.stats = DefaultBotStats;
    }

    /**
     * Reset recorded stats.
     */
    public reset(): this {
        this.stats = DefaultBotStats;

        return this;
    }

    public getAsReadonly(): ReadonlyBotStats {
        return this.stats;
    }
}
