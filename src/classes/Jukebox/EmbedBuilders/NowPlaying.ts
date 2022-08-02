import { EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { ActiveJukeboxStatus } from '../types';
import { Config } from '../../../global/Config';
import { viewCountFormatter } from '../../../functions/viewCountFormatter';
import { Jukebox } from '../Jukebox';
import { getQueueLength } from '../../../functions/getQueueLength';
import { makeQueueFooter } from './queueFooter';
import { numericalToString } from '../../../functions/timeConverters';

/** Makes a "now playing X" embed. */
export function makeNowPlayingEmbed(jukebox: Jukebox, status: ActiveJukeboxStatus): EmbedBuilder {
    const disc = status.playing;

    const playingFor = Math.floor((Date.now() - status.playingSince) / 1000);
    const playingLeft = disc.durationSeconds - playingFor;
    const percentDone = Math.floor((100 * playingFor) / disc.durationSeconds);

    const embed = new EmbedBuilder()
        .setTitle(disc.title)
        .setAuthor({ name: `Now Playing`, iconURL: disc.addedBy.displayAvatarURL() })
        .setURL(disc.url)
        .setThumbnail(disc.thumbnail)
        .setDescription(
            `Duration: ${disc.durationString}\nViews: ${viewCountFormatter(disc.views)}\nChannel: ${disc.channel}`,
        )
        .addFields(
            { name: `Requested By`, value: `${disc.addedBy} ${moment(disc.addedAt).fromNow()}` },
            {
                name: `Time Elapsed (${percentDone}%)`,
                value: `${numericalToString(playingFor)} (${numericalToString(playingLeft)} Left)`,
            },
        )
        .setColor(Config.embedColor);

    if (jukebox.inventory.length) {
        const { totalDuration, numLiveVideos } = getQueueLength(jukebox.inventory);

        embed.setFooter(
            makeQueueFooter(
                jukebox.inventory.length,
                numLiveVideos,
                numericalToString(totalDuration),
                jukebox.startingInteraction.guild.iconURL(),
            ),
        );
    }

    return embed;
}
