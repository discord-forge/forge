import {Unit, Test, Assert, Is, Does} from "unit";
import {testBot} from "../TestBot";
import TestData from "../TestData";
import {Bot} from "../../../Index";

@Unit("Bot Dispose")
default class {
    @Test("reconnect(): should reconnect the bot without throwing")
    public reconnect_doesNotThrow() {
        return new Promise(async (resolve) => {
            let resultError: Error | null = null;

            try {
                await testBot.reconnect();
            }
            catch (error) {
                resultError = error;
            }

            Assert.that(resultError, Is.null);

            resolve();
        });
    }

    @Test("reload(): should reload modules")
    public async reload_reloadModules() {
        await testBot.reload();

        // TODO: Verify modules were re-loaded.
    }

    @Test("disconnect(): should disconnect the bot and dispose resources")
    public async disconnect_shouldDisconnect() {
        const result: Bot = await testBot.disconnect();

        // TODO: Additional verification that the bot disconnected (was dispose called?).

        Assert.that(result, Is.object);

        Assert.that(result.client.user,
            Is.object,
            Does.haveProperty("id")
        );

        Assert.equal(result.client.user.id, TestData.id);
    }
}
