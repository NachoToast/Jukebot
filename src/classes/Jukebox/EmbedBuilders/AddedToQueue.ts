import { EmbedBuilder } from 'discord.js';
import { getQueueLength } from '../../../functions/getQueueLength';
import { getTimeTillPlaybackDone } from '../../../functions/getTimeTillPlaybackDone';
import { numericalToString } from '../../../functions/timeConverters';
import { viewCountFormatter } from '../../../functions/viewCountFormatter';
import { Config } from '../../../global/Config';
import { Loggers } from '../../../global/Loggers';
import { MapSearchSourceToTypes, ValidSearchSources } from '../../../types/Searches';
import { HopperResult, PlaylistMetadata } from '../../Hopper/types';
import { MusicDisc } from '../../MusicDisc';
import { Jukebox } from '../Jukebox';
import { makeQueueFooter } from './queueFooter';

/**
 * Makes an "added X to queue" embed, with additional information if multiple items were added.
 *
 * @param {Jukebox} jukebox The Jukebox the items were added to.
 * @param {HopperResult} result Items that were added, and any errors that occured.
 *
 * @throws Throws an error if the length of items added is 0.
 */
export function makeAddedToQueueEmbed(
    jukebox: Jukebox,
    result: HopperResult<ValidSearchSources, MapSearchSourceToTypes<ValidSearchSources>>,
    playbackStarted: boolean,
): EmbedBuilder {
    if (result.items.length === 0) throw new Error(`Cannot make "Added To Queue" embed with 0 items!`);

    // if playlist specific embed
    if (result.playlistMetadata !== undefined) {
        const baseEmbed = makePlaylistAddedToQueueEmbed(
            result.items,
            jukebox,
            result.playlistMetadata,
            playbackStarted,
        );

        if (result.items.length === result.playlistMetadata.playlistSize) {
            // lengths match, so we added all items from the playlist successfully
            return baseEmbed;
        }

        /** Number of songs where we're not sure why they weren't added. */
        let numUnaccountedFor = result.playlistMetadata.playlistSize - result.items.length;

        if (result.errors.length) {
            let firstXErrors = result.errors
                .slice(0, 5)
                .map((e) => e.toString())
                .join(`\n`);
            if (result.errors.length > 5) firstXErrors += `\n${result.errors.length - 5} more errors...`;

            // some songs weren't added due to errors
            baseEmbed.addFields({
                name: `Errored Songs (${result.errors.length})`,
                value: firstXErrors,
            });
            numUnaccountedFor -= result.errors.length;
        }

        if (jukebox.isFull && numUnaccountedFor > 0) {
            // some songs weren't added due to queue being full
            baseEmbed.addFields({
                name: `Queue Full`,
                value: `**${numUnaccountedFor}** Songs were skipped due to the queue being full (${Config.maxQueueSize}).`,
            });
        }

        if (numUnaccountedFor > 0) {
            Loggers.error.log(`Got results unaccounted for in "AddedToQueue" embed maker`, {
                numUnaccountedFor,
                full: jukebox.isFull,
                errored: result.errors.length,
                succeeded: result.items.length,
                existingQueue: jukebox.inventory.length,
                result: {
                    items: result.items.map((e) => e.toJSON()),
                    errors: result.errors.map((e) => e.toString()),
                    meta: result.playlistMetadata,
                },
            });
        }

        return baseEmbed;
    }

    return makeSingleAddedToQueueEmbed(result.items[0], jukebox);
}

/** An "Added To Queue" embed for a playlist where all items were added successfully. */
function makePlaylistAddedToQueueEmbed(
    discs: MusicDisc[],
    jukebox: Jukebox,
    metadata: PlaylistMetadata,
    playbackStarted: boolean,
) {
    const { totalDuration: playlistDuration } = getQueueLength(discs);
    const description = `Duration: ${numericalToString(playlistDuration)}`;

    let songSummary = ``;
    for (let i = 0, len = Math.min(discs.length, 10); i < len; i++) {
        const { title, durationString } = discs[i];
        songSummary += `\n${i + 1}. ${title} (${durationString})`;
    }

    if (discs.length > 10) {
        songSummary += `\n${discs.length - 10} more...`;
    }

    const { totalDuration: nonPlaylistDuration, numLiveVideos } = getQueueLength(
        jukebox.inventory.slice(0, -discs.length),
    );

    const timeTillPlay = nonPlaylistDuration + getTimeTillPlaybackDone(jukebox);

    const { totalDuration } = getQueueLength(jukebox.inventory);

    const embed = new EmbedBuilder()
        .setTitle(metadata.playlistName)
        .setAuthor({
            name: `Added ${discs.length} Song${discs.length !== 1 ? `s` : ``} to Queue`,
            iconURL: discs[0].origin.member.displayAvatarURL(),
        })
        .setColor(Config.embedColor)
        .setURL(metadata.playlistURL)
        .setThumbnail(metadata.playlistImageURL)
        .setDescription(description)
        .setFooter(
            makeQueueFooter(
                jukebox.inventory.length,
                numLiveVideos,
                numericalToString(totalDuration),
                discs[0].origin.guild.iconURL(),
            ),
        );

    if (!playbackStarted) {
        embed.addFields({
            name: `Position in Queue: **${jukebox.inventory.length - discs.length}**`,
            value: `Time till play: ${
                numLiveVideos > 0
                    ? `n/a (${numLiveVideos} Live Video${numLiveVideos !== 1 ? `s` : ``} Present)`
                    : numericalToString(timeTillPlay)
            }`,
        });
    }

    embed.addFields({
        name: `Songs Preview`,
        value: songSummary,
    });

    return embed;
}

/** An "Added To Queue" embed for a single item. */
function makeSingleAddedToQueueEmbed(disc: MusicDisc, jukebox: Jukebox): EmbedBuilder {
    const { views, channel, title, url, thumbnail, origin } = disc;
    let description = `Duration: ${disc.durationString}`;

    if (views) description += `\nViews: ${viewCountFormatter(views)}`;
    description += `\nChannel: ${channel}`;

    // we slice to avoid information about the song that was just added
    const { totalDuration, numLiveVideos } = getQueueLength(jukebox.inventory.slice(0, -1));

    const timeTillPlay = totalDuration + getTimeTillPlaybackDone(jukebox);

    return new EmbedBuilder()
        .setTitle(title)
        .setAuthor({ name: `Added to Queue`, iconURL: origin.member.displayAvatarURL() })
        .setColor(Config.embedColor)
        .setURL(url)
        .setThumbnail(thumbnail)
        .setDescription(description)
        .addFields({
            name: `Position in Queue: **${jukebox.inventory.length}**`,
            value: `Time till play: ${
                numLiveVideos > 0
                    ? `n/a (${numLiveVideos} Live Video${numLiveVideos !== 1 ? `s` : ``} Present)`
                    : numericalToString(timeTillPlay)
            }`,
        })
        .setFooter(
            makeQueueFooter(
                jukebox.inventory.length,
                numLiveVideos,
                numericalToString(totalDuration),
                origin.guild.iconURL(),
            ),
        );
}
