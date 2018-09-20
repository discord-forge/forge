import CommandParser from "../commands/command-parser";
import CommandContext from "../commands/command-context";
import ConsoleInterface from "../console/console-interface";
import EmojiMenuManager from "../emoji-ui/emoji-menu-manager";
import CommandStore from "../commands/command-store";
import Utils from "./utils";
import EmojiCollection from "../collections/emoji-collection";
import Settings from "./settings";
import Log from "./log";
import DataProvider from "../data-providers/data-provider";
import CommandAuthStore from "../commands/auth-stores/command-auth-store";
import Temp from "./temp";
import Discord, {Client, GuildChannel, GuildMember, Message, RichEmbed, Role, Snowflake, TextChannel} from "discord.js";
import JsonAuthStore from "../commands/auth-stores/json-auth-store";
import ServiceManager from "../services/service-manager";

import Command, {
    ArgumentResolver,
    ArgumentStyle,
    RawArguments,
    CustomArgType,
    UserGroup
} from "../commands/command";

import JsonProvider from "../data-providers/json-provider";
import CommandHandler from "../commands/command-handler";
import EventEmitter from "events";
import fs from "fs";
import {performance} from "perf_hooks";
import path from "path";
import FragmentLoader from "../fragments/fragment-loader";
import Fragment from "../fragments/fragment";
import Language from "../language/language";
import Service from "../services/service";
import {BotEvents} from "../decorators/decorators";

const title: string =
    " █████╗ ███╗   ██╗██╗   ██╗██╗██╗     \n" +
    "██╔══██╗████╗  ██║██║   ██║██║██║     \n" +
    "███████║██╔██╗ ██║██║   ██║██║██║     \n" +
    "██╔══██║██║╚██╗██║╚██╗ ██╔╝██║██║     \n" +
    "██║  ██║██║ ╚████║ ╚████╔╝ ██║███████╗\n" +
    "╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝╚══════╝ {version}";

const internalFragmentsPath: string = path.resolve(path.join(__dirname, "../fragments/internal"));

type MessageInfo = {
    guildName: string;
    channelName: string;
    authorId: Snowflake;
    authorTag: string;
    message: string;
    time: number;
};

export interface BotOptions {
    readonly settings: Settings;
    readonly authStore: CommandAuthStore;
    readonly dataStore?: DataProvider;
    readonly prefixCommand?: boolean;
    readonly primitiveCommands?: Array<string>;
    readonly userGroups?: Array<UserGroup>;
    readonly owner?: Snowflake;
    readonly options?: BotExtraOptions;
    readonly argumentResolvers?: Array<ArgumentResolver>;
    readonly argumentTypes?: Array<CustomArgType>;
}

export const DefaultBotEmojiOptions: DefiniteBotEmojiOptions = {
    success: ":white_check_mark:",
    error: ":thinking:"
};

export type BotEmojiOptions = {
    readonly success?: string;
    readonly error?: string;
};

export type DefiniteBotEmojiOptions = {
    readonly success: string;
    readonly error: string;
};

export interface BotExtraOptions {
    readonly asciiTitle?: boolean;
    readonly consoleInterface?: boolean;
    readonly allowCommandChain?: boolean;
    readonly updateOnMessageEdit?: boolean;
    readonly checkCommands?: boolean;
    readonly autoDeleteCommands?: boolean;
    readonly commandArgumentStyle?: ArgumentStyle;
    readonly ignoreBots?: boolean;
    readonly autoResetAuthStore?: boolean;
    readonly logMessages?: boolean;
    readonly dmHelp?: boolean;
    readonly emojis?: BotEmojiOptions;
}

export interface DefiniteBotExtraOptions {
    readonly asciiTitle: boolean;
    readonly consoleInterface: boolean;
    readonly allowCommandChain: boolean;
    readonly updateOnMessageEdit: boolean;
    readonly checkCommands: boolean;
    readonly autoDeleteCommands: boolean;
    readonly commandArgumentStyle: ArgumentStyle;
    readonly ignoreBots: boolean;
    readonly autoResetAuthStore: boolean;
    readonly logMessages: boolean;
    readonly dmHelp: boolean;
    readonly emojis: DefiniteBotEmojiOptions;
}

/**
 * @extends EventEmitter
 */
export default class Bot<ApiType = any> extends EventEmitter {
    public readonly settings: Settings;
    public readonly temp: Temp;
    public readonly dataStore?: DataProvider;
    public readonly authStore: CommandAuthStore;
    public readonly emojis?: EmojiCollection;
    public readonly client: Client; // TODO
    public readonly services: ServiceManager;
    public readonly commandStore: CommandStore;
    public readonly commandHandler: CommandHandler;
    public readonly console: ConsoleInterface;
    public readonly menus: EmojiMenuManager;
    public readonly prefixCommand: boolean;
    public readonly primitiveCommands: Array<string>;
    public readonly userGroups: Array<UserGroup>;
    public readonly owner?: Snowflake;
    public readonly options: DefiniteBotExtraOptions;
    public readonly language?: Language;
    public readonly argumentResolvers: Array<ArgumentResolver>;
    public readonly argumentTypes: Array<CustomArgType>;

    public  suspended: boolean;

    private api?: ApiType;
    private setupStart: number = 0;

    /**
     * Setup the bot from an object
     * @param {BotOptions} botOptions
     * @return {Promise<Bot>}
     */
    constructor(botOptions: BotOptions) {
        super();

        /**
         * @type {Settings}
         * @readonly
         */
        this.settings = botOptions.settings;

        /**
         * @todo Temporary hard-coded user id
         * @type {Temp}
         * @readonly
         */
        this.temp = new Temp();

        /**
         * @type {DataProvider | undefined}
         * @readonly
         */
        this.dataStore = botOptions.dataStore;

        /**
         * @type {CommandAuthStore}
         * @readonly
         */
        this.authStore = botOptions.authStore || new JsonAuthStore("auth/schema.json", "auth/store.json");

        /**
         * @type {EmojiCollection | undefined}
         * @readonly
         */
        this.emojis = fs.existsSync(this.settings.paths.emojis) ? EmojiCollection.fromFile(this.settings.paths.emojis) : undefined;

        /**
         * @type {Discord.Client}
         * @readonly
         */
        this.client = new Discord.Client();

        /**
         * @type {ServiceManager}
         * @readonly
         */
        this.services = new ServiceManager(this);

        /**
         * @type {CommandStore}
         * @readonly
         */
        this.commandStore = new CommandStore(this, this.authStore);

        /**
         * @type {CommandHandler}
         * @readonly
         */
        this.commandHandler = new CommandHandler({
            commandStore: this.commandStore,
            errorHandlers: [], // TODO: Is this like it was? Is it ok?
            authStore: this.authStore,
            argumentTypes: botOptions.argumentTypes || {}
        });

        /**
         * @type {ConsoleInterface}
         * @readonly
         */
        this.console = new ConsoleInterface();

        /**
         * @type {EmojiMenuManager}
         * @readonly
         */
        this.menus = new EmojiMenuManager(this.client);

        /**
         * @type {boolean}
         * @readonly
         */
        this.prefixCommand = botOptions.prefixCommand || true;

        /**
         * @todo Even if it's not specified here, the throw command was loaded, verify that ONLY specific primitives can be loaded.
         * @type {Array<string>}
         * @readonly
         */
        this.primitiveCommands = botOptions.primitiveCommands || [
            "help",
            "usage",
            "ping",
            "auth",
            "setauth",
            "prefix",
            "cli",
            "throw"
        ];

        /**
         * @type {DefiniteBotExtraOptions}
         * @readonly
         */
        this.options = {
            allowCommandChain: botOptions.options && botOptions.options.allowCommandChain !== undefined ? botOptions.options.allowCommandChain : true,
            commandArgumentStyle: botOptions.options && botOptions.options.commandArgumentStyle || ArgumentStyle.Explicit,
            autoDeleteCommands: botOptions.options && botOptions.options.autoDeleteCommands || false,
            checkCommands: botOptions.options && botOptions.options.checkCommands !== undefined ? botOptions.options.checkCommands : true,
            ignoreBots: botOptions.options && botOptions.options.ignoreBots !== undefined ? botOptions.options.ignoreBots : true,
            updateOnMessageEdit: botOptions.options && botOptions.options.updateOnMessageEdit !== undefined ? botOptions.options.updateOnMessageEdit : false,
            asciiTitle: botOptions.options && botOptions.options.asciiTitle !== undefined ? botOptions.options.asciiTitle : true,
            consoleInterface: botOptions.options && botOptions.options.consoleInterface !== undefined ? botOptions.options.consoleInterface : true,
            autoResetAuthStore: botOptions.options && botOptions.options.autoResetAuthStore !== undefined ? botOptions.options.autoResetAuthStore : false,
            dmHelp: botOptions.options && botOptions.options.dmHelp !== undefined ? botOptions.options.dmHelp : true,
            logMessages: botOptions.options && botOptions.options.logMessages !== undefined ? botOptions.options.logMessages : false,

            emojis: botOptions.options && botOptions.options.emojis !== undefined ? {
                success: botOptions.options.emojis.success || DefaultBotEmojiOptions.success,
                error: botOptions.options.emojis.error || DefaultBotEmojiOptions.error
            } : DefaultBotEmojiOptions
        };

        // TODO: Make use of the userGroups property
        /**
         * @type {Array<UserGroup>}
         * @readonly
         */
        this.userGroups = botOptions.userGroups || [];

        /**
         * @type {Snowflake | undefined}
         * @readonly
         */
        this.owner = botOptions.owner;

        /**
         * Localization
         * @type {Language | undefined}
         * @readonly
         */
        this.language = this.settings.paths.languages ? new Language(this.settings.paths.languages) : undefined;

        /**
         * @type {Array<ArgumentResolver>}
         * @readonly
         */
        this.argumentResolvers = botOptions.argumentResolvers || [];

        /**
         * @type {Array<CustomArgType>}
         * @readonly
         */
        this.argumentTypes = botOptions.argumentTypes || [];

        /**
         * @type {boolean}
         */
        this.suspended = false;

        return this;
    }

    /**
     * @return {* | null}
     */
    public getAPI(): ApiType | null {
        return this.api || null;
    }

    /**
     * Setup the bot
     * @return {Promise<this>}
     */
    public async setup(api?: ApiType): Promise<this> {
        if (this.options.asciiTitle) {
            console.log("\n" + title.replace("{version}", "beta") + "\n");
        }

        /**
         * @type {*}
         * @private
         * @readonly
         */
        this.api = api;

        /**
         * @type {number}
         * @private
         */
        this.setupStart = performance.now();

        Log.verbose("[Bot.setup] Attempting to load internal fragments");

        // Load & enable internal fragments
        const internalFragmentCandidates: Array<string> | null = await FragmentLoader.pickupCandidates(internalFragmentsPath);

        if (!internalFragmentCandidates) {
            throw new Error("[Bot.setup] Failed to load internal fragments");
        }

        if (internalFragmentCandidates.length > 0) {
            Log.verbose(`[Bot.setup] Loading ${internalFragmentCandidates.length} internal fragments`);
        }
        else {
            Log.warn("[Bot.setup] No internal fragments were detected");
        }

        const internalFragments: Array<Fragment> | null = await FragmentLoader.loadMultiple(internalFragmentCandidates);

        if (!internalFragments || internalFragments.length === 0) {
            Log.warn("[Bot.setup] No internal fragments were loaded");
        }
        else {
            const enabled: number = this.enableFragments(internalFragments, true);

            if (enabled === 0) {
                Log.warn("[Bot.setup] No internal fragments were enabled");
            }
            else {
                Log.success(`[Bot.setup] Enabled ${enabled}/${internalFragments.length} internal fragments`);
            }
        }

        // Load & enable services
        const consumerServiceCandidates: Array<string> | null = await FragmentLoader.pickupCandidates(this.settings.paths.services);

        if (!consumerServiceCandidates || consumerServiceCandidates.length === 0) {
            Log.verbose(`[Bot.setup] No services were detected under '${this.settings.paths.services}'`);
        }
        else {
            Log.verbose(`[Bot.setup] Loading ${consumerServiceCandidates.length} service(s)`);

            const servicesLoaded: Array<Fragment> | null = await FragmentLoader.loadMultiple(consumerServiceCandidates);

            if (!servicesLoaded || servicesLoaded.length === 0) {
                Log.warn("[Bot.setup] No services were loaded");
            }
            else {
                Log.success(`[Bot.setup] Loaded ${servicesLoaded.length} service(s)`);
                this.enableFragments(servicesLoaded);
            }
        }

        // After loading services, enable all of them
        this.services.enableAll();

        // Load & enable consumer command fragments
        const consumerCommandCandidates: Array<string> | null = await FragmentLoader.pickupCandidates(this.settings.paths.commands);

        if (!consumerCommandCandidates || consumerCommandCandidates.length === 0) {
            Log.warn(`[Bot.setup] No commands were detected under '${this.settings.paths.commands}'`);
        }
        else {
            Log.verbose(`[Bot.setup] Loading ${consumerCommandCandidates.length} command(s)`);

            const commandsLoaded: Array<Fragment> | null = await FragmentLoader.loadMultiple(consumerCommandCandidates);

            if (!commandsLoaded || commandsLoaded.length === 0) {
                Log.warn("[Bot.setup] No commands were loaded");
            }
            else {
                Log.success(`[Bot.setup] Loaded ${commandsLoaded.length} command(s)`);
                this.enableFragments(commandsLoaded);
            }
        }

        // Setup the Discord client's events
        this.setupEvents();

        Log.success("[Bot.setup] Bot setup completed");

        return this;
    }

    /**
     * @param {Array<Fragment>} fragments
     * @param {boolean} internal Whether the fragments are internal
     * @return {number}
     */
    private enableFragments(fragments: Array<Fragment>, internal: boolean = false): number {
        let enabled: number = 0;

        for (let i: number = 0; i < fragments.length; i++) {
            if ((fragments[i] as any).prototype instanceof Command) {
                const fragment: any = new (fragments[i] as any)();

                // Command is not registered in primitive commands
                if (internal && !this.primitiveCommands.includes(fragment.meta.name)) {
                    continue;
                }

                this.commandStore.register(fragment);
                enabled++;
            }
            else if ((fragments[i] as any).prototype instanceof Service) {
                const service: any = fragments[i];

                this.services.register(new service({
                    bot: this,
                    api: this.getAPI()
                }));

                enabled++;
            }
            else {
                // TODO: Also add someway to identify the fragment
                Log.warn("[Bot.enableFragments] Unknown fragment instance, ignoring");
            }
        }

        return enabled;
    }

    /**
     * Setup the client's events
     */
    private setupEvents(): void {
        Log.verbose("[Bot.setupEvents] Setting up Discord events");

        // Discord client events
        this.client.on("ready", async () => {
            // Setup temp
            this.temp.setup(this.client.user.id);

            // Create the temp folder
            await this.temp.create();

            if (this.options.consoleInterface && !this.console.ready) {
                // Setup the console command interface
                this.console.setup(this);
            }

            // Setup the command auth store
            await this.setupAuthStore();
            Log.info(`[Bot.setupEvents] Logged in as ${this.client.user.tag} | ${this.client.guilds.size} guild(s)`);

            let suffix = "s";
            let took = (performance.now() - this.setupStart) / 1000;
            let rounded = Math.round(took);

            if (rounded <= 0) {
                rounded = Math.round(took * 1000);
                suffix = "ms";
            }

            Log.success(`[Bot.setupEvents] Ready | Took ${rounded}${suffix}`);
        });

        this.client.on("message", this.handleMessage.bind(this));

        // If enabled, handle message edits (if valid) as commands
        if (this.options.updateOnMessageEdit) {
            this.client.on("messageUpdate", async (oldMessage: Message, newMessage: Message) => {
                await this.handleMessage(newMessage, true);
            });
        }

        // Setup user events
        BotEvents.forEach((value: any, key: string) => {
            this.client.on(key, value);
        });

        Log.success("[Bot.setupEvents] Discord events setup completed");
    }

    /**
     * @param {Message} message
     * @param {boolean} [edited=false] Whether the message was edited
     * @return {Promise<void>}
     */
    public async handleMessage(message: Message, edited: boolean = false): Promise<void> {
        if (this.suspended) {
            return;
        }

        if (this.options.logMessages) {
            const names: any = {};

            if (message.channel.type === "text" && message.guild !== undefined) {
                names.guild = message.guild.name;
                names.channel = ` # ${(message.channel as TextChannel).name}`;
            }
            else if (message.channel.type === "dm" && message.guild === undefined) {
                names.guild = "";
                names.channel = "Direct Messages";
            }
            else {
                names.guild = "Unknown";
                names.channel = " # Unknown";
            }

            Log.info(`[${message.author.tag} @ ${names.guild}${names.channel}] ${Utils.cleanMessage(message)}${edited ? " [Edited]" : ""}`);
        }

        // TODO: Should be a property/option on Bot, not hardcoded
        // TODO: Find better position
        // TODO: Merge this resolvers with the (if provided) provided
        // ones by the user.
        const resolvers: any = {
            user: (arg: string) => Utils.resolveId(arg),
            channel: (arg: string) => Utils.resolveId(arg),
            role: (arg: string) => Utils.resolveId(arg),
            state: (arg: string) => Utils.translateState(arg),

            member: (arg: string, message: Message): GuildMember | null => {
                const resolvedMember: GuildMember = message.guild.member(Utils.resolveId(arg));

                if (resolvedMember) {
                    return resolvedMember;
                }

                return null;
            }
        };

        // TODO: Cannot do .startsWith with a prefix array
        if ((!message.author.bot || (message.author.bot && !this.options.ignoreBots)) /*&& message.content.startsWith(this.settings.general.prefix)*/ && CommandParser.validate(message.content, this.commandStore, this.settings.general.prefixes)) {
            if (this.options.allowCommandChain) {
                const chain: Array<string> = message.content.split("&");

                // TODO: What if commandChecks is start and the bot tries to react twice or more?
                for (let i: number = 0; i < chain.length; i++) {
                    await this.handleCommandMessage(message, chain[i].trim(), resolvers);
                }
            }
            else {
                await this.handleCommandMessage(message, message.content, resolvers);
            }
        }
        // TODO: ?prefix should also be chain-able
        else if (message.content === "?prefix" && this.prefixCommand) {
            message.channel.send(new RichEmbed()
                .setDescription(`Command prefix(es): **${this.settings.general.prefixes.join(", ")}** | Powered by [Anvil v**${await Utils.getAnvilVersion()}**](http://test.com/)`)
                .setColor("GREEN"));
        }
    }

    /**
     * @param {Message} message
     * @param {string} content
     * @param {*} resolvers
     * @return {Promise<void>}
     */
    public async handleCommandMessage(message: Message, content: string, resolvers: any): Promise<void> {
        const command: Command | null = CommandParser.parse(
            content,
            this.commandStore,
            this.settings.general.prefixes
        );

        if (command !== null) {
            const rawArgs: RawArguments = CommandParser.resolveDefaultArgs({
                arguments: CommandParser.getArguments(content),
                schema: command.arguments,

                // TODO: Should pass context instead of just message for more flexibility from defaultValue fun
                message: message,
                command: command
            });

            // TODO: Debugging
            Log.debug("raw args, ", rawArgs);

            await this.commandHandler.handle(
                new CommandContext({
                    message: message,
                    // args: CommandParser.resolveArguments(CommandParser.getArguments(content), this.commandHandler.argumentTypes, resolvers, message),
                    bot: this,

                    // TODO: CRITICAL: Possibly messing up private messages support, hotfixed to use null (no auth) in DMs (old comment: review)
                    // TODO: CRITICAL: Default access level set to 0
                    auth: message.guild ? this.authStore.getAuthority(message.guild.id, message.author.id, message.member.roles.map((role: Role) => role.name)) : 0,
                    emojis: this.emojis,
                    label: CommandParser.getCommandBase(message.content, this.settings.general.prefixes)
                }),

                command,

                rawArgs
            );
        }
        else {
            Log.error("[Bot.handleCommandMessage] Failed parsing command");
        }
    }

    /**
     * Setup the bot's auth store
     */
    public async setupAuthStore(): Promise<void> {
        // Initially load data if it is a JsonAuthStore
        if (this.authStore instanceof JsonAuthStore) {
            await this.authStore.reload();
        }

        const guilds = this.client.guilds.array();

        let entries = 0;

        for (let i = 0; i < guilds.length; i++) {
            if (!this.authStore.contains(guilds[i].id)) {
                this.authStore.create(guilds[i].id);
                entries++;
            }
        }

        // Save the auth store if it is a JsonAuthStore
        if (this.authStore instanceof JsonAuthStore) {
            await this.authStore.save();
        }

        if (entries > 0) {
            Log.info(`[Bot.setupAuthStore] Added a total of ${entries} new auth store entries`);
        }

        Log.success("[Bot.setupAuthStore] Auth store setup completed");
    }

    /**
     * @param {*} api
     * @return {Promise<void>}
     */
    public async setupAndConnect(api?: ApiType): Promise<void> {
        await (await this.setup(api)).connect();
    }

    /**
     * Connect the client
     * @return {Promise<Bot>}
     */
    public async connect(): Promise<Bot> {
        Log.verbose("[Bot.connect] Starting");
        await this.client.login(this.settings.general.token);

        return this;
    }

    /**
     * @todo Use the reload modules param
     * Restart the client
     * @param {boolean} reloadModules Whether to reload all modules
     * @return {Promise<Bot>}
     */
    public async restart(reloadModules: boolean = true): Promise<Bot> {
        Log.verbose("[Bot.restart] Restarting");

        if (reloadModules) {
            // TODO: Actually reload all the features and commandStore
            // this.features.reloadAll(this);
            // TODO: New fragments system
            // await this.commandLoader.reloadAll();
        }

        await this.disconnect();
        await this.connect();

        return this;
    }

    /**
     * Disconnect the client
     * @return {Promise<Bot>}
     */
    public async disconnect(): Promise<Bot> {
        // Save auth store if it's a JsonAuthStore
        if (this.authStore instanceof JsonAuthStore) {
            Log.verbose("[Bot.disconnect] Saving auth store");
            await this.authStore.save();
        }

        // Save data before exiting
        if (this.dataStore && this.dataStore instanceof JsonProvider) {
            Log.verbose("[Bot.disconnect] Saving JsonProvider");
            await this.dataStore.save();
        }

        // Reset the temp folder before shutdown
        await this.temp.reset();

        // TODO
        //this.settings.save();
        await this.client.destroy();
        Log.info("[Bot.disconnect] Disconnected");

        return this;
    }

    /**
     * Clear all the files inside the temp folder
     * @return {Promise<*>}
     */
    public static clearTemp(): void {
        if (fs.existsSync("./temp")) {
            fs.readdir("./temp", (error: any, files: any) => {
                for (let i = 0; i < files.length; i++) {
                    fs.unlink(`./temp/${files[i]}`, (error: Error) => {
                        throw error;
                    });
                }
            });
        }
    }
}
