import { EmbedBuilder, InteractionReplyOptions } from 'discord.js';
import moment from 'moment';
import { ActiveJukeboxStatus } from '../types';
import { Config } from '../../../global/Config';
import { viewCountFormatter } from '../../../functions/viewCountFormatter';
import { Jukebox } from '../Jukebox';
import { numericalToString } from '../../../functions/timeConverters';
import { getQueueLength } from '../../../functions/getQueueLength';

/** Makes a "now playing X" embed. */
export function makeNowPlayingEmbed(jukebox: Jukebox, status: ActiveJukeboxStatus): InteractionReplyOptions {
    const disc = status.playing;
    const queueSize = jukebox.inventory.length;

    const embed = new EmbedBuilder()
        .setTitle(disc.title)
        .setAuthor({ name: `Now Playing`, iconURL: disc.addedBy.displayAvatarURL() })
        .setURL(disc.url)
        .setThumbnail(disc.thumbnail)
        .setDescription(
            `Duration: ${disc.durationString}\nViews: ${viewCountFormatter(disc.views)}\nChannel: ${disc.channel}`,
        )
        .addFields({ name: `**Requested By**`, value: `${disc.addedBy} ${moment(disc.addedAt).fromNow()}` })
        .setColor(Config.embedColor);

    if (queueSize > 0) {
        const { totalDuration, numLiveVideos } = getQueueLength(jukebox.inventory);
        let queueTimeString;
        const queueTime = numericalToString(totalDuration);
        if (numLiveVideos == queueSize) {
            // only live videos
            queueTimeString = `Queue Time: n/a (All live videos)`;
        } else if (numLiveVideos === 0) {
            // no live videos
            queueTimeString = `Queue Time: ${queueTime}`;
        } else {
            // some live, some non-live videos
            queueTimeString = `Queue Time: ${queueTime} (Excluding ${numLiveVideos} live video${
                numLiveVideos !== 1 ? `s` : ``
            })`;
        }
        embed.setFooter({ text: `Queue Length: ${queueSize} | ${queueTimeString}` });
    }

    return { embeds: [embed] };
}
