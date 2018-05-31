import {Client, Message} from "discord.js";
import EmojiMenu from "./emoji-menu";

export default class EmojiMenuManager {
    private readonly client: Client;
    private readonly awaiting: Array<any>;

    /**
     * @param {Discord.Client} client
     */
    constructor(client: Client) {
        /**
         * @type {Discord.Client}
         * @private
         * @readonly
         */
        this.client = client;

        /**
         * @type {Array}
         * @private
         * @readonly
         */
        this.awaiting = [];

        this.client.on("messageReactionAdd", (reaction, user) => {
            if (!user.bot) {
                for (let i = 0; i < this.awaiting.length; i++) {
                    if (this.awaiting[i].messageId === reaction.message.id) {
                        for (let buttonIndex = 0; buttonIndex < this.awaiting[i].menu.buttons.length; buttonIndex++) {
                            if (this.awaiting[i].menu.buttons[buttonIndex].emoji === reaction.emoji.name) {
                                this.awaiting[i].menu.buttons[buttonIndex].handle(reaction.message, user);

                                break;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * @param {*} channel
     * @param {EmojiMenu} menu
     * @return {Promise<Message>}
     */
    async show(channel: any, menu: EmojiMenu): Promise<Message> {
        const sentMessage = await channel.send(menu.content);

        for (let i = 0; i < menu.buttons.length; i++) {
            await sentMessage.react(menu.buttons[i].emoji);
        }

        this.awaiting.push({
            menu: menu,
            channel: channel,
            messageId: sentMessage.id
        });

        return sentMessage;
    }
}