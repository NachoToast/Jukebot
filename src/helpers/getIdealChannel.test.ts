import { Channel, Collection, Guild, Snowflake } from 'discord.js';
import { getIdealChannel } from './getIdealChannel';

describe('getIdealChannel', () => {
    const channelCollection = new Collection<Snowflake, Channel>();
    const fakeGuild = { channels: { fetch: () => channelCollection }, me: true } as unknown as Guild;

    const validChannel = {
        type: 'GUILD_TEXT',
        me: true,
        permissionsFor: () => {
            return { has: () => true };
        },
        name: 'a valid channel',
    } as unknown as Channel;

    beforeEach(() => {
        channelCollection.clear();
    });

    it('finds a valid channel', async () => {
        channelCollection.set('fakeId', validChannel);
        expect(await getIdealChannel(fakeGuild)).toBe(validChannel);
    });

    it('skips invalid channels', async () => {
        const notText = { ...validChannel, type: 'ANOTHER_TYPE' } as unknown as Channel;
        const noPerms = {
            ...validChannel,
            permissionsFor: () => {
                return { has: () => false };
            },
        } as unknown as Channel;

        channelCollection.set('fakeId1', notText);
        channelCollection.set('fakeId2', noPerms);

        expect(await getIdealChannel(fakeGuild)).toBe(null);

        channelCollection.set('fakeId3', validChannel);
        expect(await getIdealChannel(fakeGuild)).toBe(validChannel);
    });

    it("skips guilds it's not in", async () => {
        const fakeGuild2 = { ...fakeGuild, me: false } as unknown as Guild;

        channelCollection.set('fakeId', validChannel);
        expect(await getIdealChannel(fakeGuild2)).toBe(null);
    });

    describe('channel name preferences', () => {
        const jukebotChannel1 = { ...validChannel, name: 'pp_jukeBOT__pp' } as unknown as Channel;
        const jukebotChannel2 = { ...validChannel, name: 'JUKE-bot' } as unknown as Channel;

        const musicChannel = { ...validChannel, name: 'music' } as unknown as Channel;
        const botCommands = { ...validChannel, name: 'bot-commands' } as unknown as Channel;
        const bot = { ...validChannel, name: 'bot' } as unknown as Channel;
        const commands = { ...validChannel, name: 'commands' } as unknown as Channel;

        it('always chooses jukebot if available', async () => {
            channelCollection.set('fakeId1', validChannel);
            channelCollection.set('fakeId2', musicChannel);
            channelCollection.set('fakeId3', jukebotChannel1);
            expect(await getIdealChannel(fakeGuild)).toBe(jukebotChannel1);

            channelCollection.set('fakeId3', jukebotChannel2);
            expect(await getIdealChannel(fakeGuild)).toBe(jukebotChannel2);
        });

        it('prefers music to bot-commands', async () => {
            channelCollection.set('fakeId1', botCommands);
            channelCollection.set('fakeId2', musicChannel);

            expect(await getIdealChannel(fakeGuild)).toBe(musicChannel);
        });

        it('follows the preferred hierarchy', async () => {
            channelCollection.set('fakeId1', validChannel);
            channelCollection.set('fakeId2', bot);
            channelCollection.set('fakeId3', validChannel);

            // try with bot
            expect(await getIdealChannel(fakeGuild)).toBe(bot);

            // try with commands
            channelCollection.set('fakeId2', commands);
            expect(await getIdealChannel(fakeGuild)).toBe(commands);

            // try with bot commands
            channelCollection.set('fakeId4', botCommands);
            expect(await getIdealChannel(fakeGuild)).toBe(botCommands);

            // try with music
            channelCollection.set('fakeId5', musicChannel);
            expect(await getIdealChannel(fakeGuild)).toBe(musicChannel);
        });
    });
});
