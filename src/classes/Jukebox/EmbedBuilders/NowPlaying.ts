import { EmbedBuilder, InteractionReplyOptions } from 'discord.js';
import moment from 'moment';
import { ActiveJukeboxStatus } from '../types';
import { Config } from '../../../global/Config';
import { viewCountFormatter } from '../../../functions/viewCountFormatter';

/** Makes a "now playing X" embed. */
export function makeNowPlayingEmbed(status: ActiveJukeboxStatus): InteractionReplyOptions {
    const disc = status.playing;
    const color = Config.embedColor

    const embed = new EmbedBuilder()
        .setTitle(disc.title)
        .setAuthor({ name: `Now Playing`, iconURL: disc.addedBy.displayAvatarURL() })
        .setURL(disc.url)
        .setThumbnail(disc.thumbnail)
        .setDescription(`Duration: ${disc.durationString}\nViews: ${viewCountFormatter(disc.views)}\nChannel: ${disc.channel}`)
        .addFields(
            { name: `**Requested By**`, value: `${disc.addedBy} ${moment(disc.addedAt).fromNow()}`})
        .setColor(color)

    return { embeds: [embed] }

}
