import { EmbedBuilder, InteractionReplyOptions } from 'discord.js';
import moment from 'moment';
import { ActiveJukeboxStatus } from '../types';
import { Config } from '../../../global/Config';
import { viewCountFormatter } from '../../../functions/viewCountFormatter';
import { Jukebox } from '../Jukebox';
import { numericalToString } from '../../../functions/timeConverters';

/** Makes a "now playing X" embed. */
export function makeNowPlayingEmbed(jukebox: Jukebox, status: ActiveJukeboxStatus): InteractionReplyOptions {
    const disc = status.playing;
    const color = Config.embedColor;
    const queueLength = jukebox.inventory.length;

    let queueTime = 0;
    for (let i = 0; i < queueLength; i++) {
        queueTime = queueTime + jukebox.inventory[i].durationSeconds;
    }

    const embed = new EmbedBuilder()
        .setTitle(disc.title)
        .setAuthor({ name: `Now Playing`, iconURL: disc.addedBy.displayAvatarURL() })
        .setURL(disc.url)
        .setThumbnail(disc.thumbnail)
        .setDescription(
            `Duration: ${disc.durationString}\nViews: ${viewCountFormatter(disc.views)}\nChannel: ${disc.channel}`,
        )
        .addFields({ name: `**Requested By**`, value: `${disc.addedBy} ${moment(disc.addedAt).fromNow()}` })
        .setColor(color);

    if (queueLength > 0) {
        embed.setFooter({ text: `Queue Length: ${queueLength} | Queue Time: ${numericalToString(queueTime)}` });
    }

    return { embeds: [embed] };
}
