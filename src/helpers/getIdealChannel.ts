import { Guild, TextChannel } from 'discord.js';

const hasJukebot = new RegExp(/juke(-)?bot/gi);

/** Gets the "best" channel to send a message in from a guild.
 *
 */
export async function getIdealChannel(guild: Guild): Promise<TextChannel | null> {
    const allChannels = await guild.channels.fetch();

    let idealChannel: TextChannel | null = null;
    let weight = -1;

    for (const [, channel] of allChannels) {
        if (channel.type !== 'GUILD_TEXT') continue;
        if (!guild.me) continue;
        const channelPerms = channel.permissionsFor(guild.me, true);
        if (!channelPerms.has('SEND_MESSAGES', true)) {
            continue;
        }
        const name = channel.name;

        if (hasJukebot.test(name)) {
            idealChannel = channel;
            break;
        }

        let localWeight = 0;
        // for some reason a regex like `/bot/gi` doesn't work :/
        const commands = name.toLowerCase().includes('commands');
        const bot = name.toLowerCase().includes('bot');
        if (bot && commands) localWeight = 5;
        else if (commands) localWeight = 4;
        else if (bot) localWeight = 3;
        else if (name.toLowerCase().includes('music')) localWeight = 2;
        else if (name.toLowerCase().includes('general')) localWeight = 1;

        if (localWeight > weight) {
            idealChannel = channel;
            weight = localWeight;
        }
    }

    return idealChannel;
}
