import Log from "./log";
import DiscordEvent from "./discord-event";
import Bot from "./bot";
import {BotState, EBotEvents} from "./bot-extra";
import {Message} from "discord.js";
import {Title, DebugMode, InternalFragmentsPath} from "./constants";
import BotMessages from "./messages";
import Loader, {IPackage} from "../fragments/loader";
import {PromiseOr} from "@atlas/xlib";
import Util from "./util";
import {performance} from "perf_hooks";

export interface IBotConnector {
    setup(): PromiseOr<this>;
}

export default class BotConnector implements IBotConnector {
    protected bot: Bot;
    protected setupStart!: number;

    public constructor(bot: Bot) {
        this.bot = bot;
    }

    /**
     * Setup the bot
     * @return {Promise<this>}
     */
    public async setup(): Promise<this> {
        this.bot.emit(EBotEvents.SetupStart);

        if (this.bot.options.asciiTitle) {
            console.log("\n" + Title.replace("{version}", "beta") + "\n");
        }

        if (DebugMode) {
            Log.info("Debug mode is enabled");
        }

        /**
         * @type {number}
         * @protected
         */
        this.setupStart = performance.now();

        // Load languages
        if (this.bot.language && this.bot.languages) {
            for (const lang of this.bot.languages) {
                await this.bot.language.load(lang);
            }
        }

        Log.verbose("Attempting to load internal fragments");
        this.bot.emit(EBotEvents.LoadingInternalFragments);

        // Load & enable internal fragments
        const internalFragmentCandidates: string[] | null = await Loader.scan(InternalFragmentsPath);

        if (!internalFragmentCandidates) {
            throw Log.error(BotMessages.SETUP_FAIL_LOAD_FRAGMENTS);
        }

        if (internalFragmentCandidates.length > 0) {
            Log.verbose(`Loading ${internalFragmentCandidates.length} internal fragments`);
        }
        else {
            Log.warn(BotMessages.SETUP_NO_FRAGMENTS_DETECTED);
        }

        const internalFragments: IPackage[] | null = await Loader.loadMultiple(internalFragmentCandidates);

        if (!internalFragments || internalFragments.length === 0) {
            Log.warn(BotMessages.SETUP_NO_FRAGMENTS_LOADED);
        }
        else {
            const enabled: number = await this.bot.fragments.enableMultiple(internalFragments, true);

            if (enabled === 0) {
                Log.warn(BotMessages.SETUP_NO_FRAGMENTS_ENABLED);
            }
            else {
                Log.success(`Enabled ${enabled}/${internalFragments.length} (${Util.percentOf(enabled, internalFragments.length)}%) internal fragments`);
            }
        }

        this.bot.emit(EBotEvents.LoadedInternalFragments, internalFragments || []);
        this.bot.emit(EBotEvents.LoadingServices);

        // Load & enable services
        const consumerServiceCandidates: string[] | null = await Loader.scan(this.bot.settings.paths.services);

        if (!consumerServiceCandidates || consumerServiceCandidates.length === 0) {
            Log.verbose(`No services were detected under '${this.bot.settings.paths.services}'`);
        }
        else {
            Log.verbose(`Loading ${consumerServiceCandidates.length} service(s)`);

            const servicesLoaded: IPackage[] | null = await Loader.loadMultiple(consumerServiceCandidates);

            if (!servicesLoaded || servicesLoaded.length === 0) {
                Log.warn(BotMessages.SETUP_NO_SERVICES_LOADED);
            }
            else {
                Log.success(`Loaded ${servicesLoaded.length} service(s)`);
                await this.bot.fragments.enableMultiple(servicesLoaded);
            }
        }

        // After loading services, enable all of them
        // TODO: Returns amount of enabled services
        await this.bot.services.startAll();

        this.bot.emit(EBotEvents.LoadedServices);
        this.bot.emit(EBotEvents.LoadingCommands);

        // Load & enable consumer command fragments
        const consumerCommandCandidates: string[] | null = await Loader.scan(this.bot.settings.paths.commands);

        if (!consumerCommandCandidates || consumerCommandCandidates.length === 0) {
            Log.warn(`No commands were detected under '${this.bot.settings.paths.commands}'`);
        }
        else {
            Log.verbose(`Loading ${consumerCommandCandidates.length} command(s)`);

            const commandsLoaded: IPackage[] | null = await Loader.loadMultiple(consumerCommandCandidates);

            if (!commandsLoaded || commandsLoaded.length === 0) {
                Log.warn(BotMessages.SETUP_NO_COMMANDS_LOADED);
            }
            else {
                const enabled: number = await this.bot.fragments.enableMultiple(commandsLoaded);

                if (enabled > 0) {
                    Log.success(`Enabled ${commandsLoaded.length}/${consumerCommandCandidates.length} (${Util.percentOf(commandsLoaded.length, consumerCommandCandidates.length)}%) command(s)`);
                }
                else {
                    Log.warn(BotMessages.SETUP_NO_COMMANDS_ENABLED);
                }
            }
        }

        // Load & enable tasks
        await this.bot.tasks.unregisterAll();
        Log.verbose(BotMessages.SETUP_LOADING_TASKS);

        const loaded: number = await this.bot.tasks.loadAll(this.bot.settings.paths.tasks);

        if (loaded > 0) {
            Log.success(`Loaded ${loaded} task(s)`);

            const enabled: number = this.bot.tasks.enableAll();

            if (enabled > 0) {
                Log.success(`Triggered ${enabled}/${loaded} task(s)`);
            }
            else if (enabled === 0 && loaded > 0) {
                Log.warn(BotMessages.SETUP_NO_TASKS_TRIGGERED);
            }
        }
        else {
            Log.verbose(BotMessages.SETUP_NO_TASKS_FOUND);
        }

        this.bot.emit(EBotEvents.LoadedCommands);

        if (this.bot.options.optimizer) {
            Log.verbose(BotMessages.SETUP_START_OPTIMIZER);

            // Start tempo engine
            this.bot.optimizer.start();

            Log.success(BotMessages.SETUP_STARTED_OPTIMIZER);
        }

        // Setup the Discord client's events
        this.setupEvents();

        Log.success(BotMessages.SETUP_COMPLETED);

        return this;
    }

    /**
     * Setup the client's events
     */
    protected setupEvents(): void {
        Log.verbose("Setting up Discord events");

        // Discord client events
        this.bot.client.on(DiscordEvent.Ready, async () => {
            // Setup temp
            this.bot.temp.setup(this.bot.client.user.id);

            // Create the temp folder
            await this.bot.temp.create();

            if (this.bot.options.consoleInterface && !this.bot.console.ready) {
                // Setup the console command interface
                this.bot.console.setup(this.bot);
            }

            Log.info(`Logged in as ${this.bot.client.user.tag} | ${this.bot.client.guilds.size} guild(s)`);

            const took: number = Math.round(performance.now() - this.setupStart);

            Log.success(`Ready | Took ${took}ms | PID ${process.pid}`);
            this.bot.setState(BotState.Connected);
            this.bot.emit(EBotEvents.Ready);
        });

        this.bot.client.on(DiscordEvent.Message, this.bot.handleMessage.bind(this));
        this.bot.client.on(DiscordEvent.Error, (error: Error) => Log.error(error.message));

        // If enabled, handle message edits (if valid) as commands
        if (this.bot.options.updateOnMessageEdit) {
            this.bot.client.on(DiscordEvent.MessageUpdated, async (oldMessage: Message, newMessage: Message) => {
                await this.bot.handleMessage(newMessage, true);
            });
        }

        Log.success("Discord events setup completed");
    }
}