import { SlashCommandBuilder } from '@discordjs/builders';
import { Hopper } from '../../classes/Hopper';
import { HopperError } from '../../classes/Hopper/Errors';
import { HopperResult } from '../../classes/Hopper/types';
import { makeAddedToQueueEmbed, makeHybridEmbed, makeNowPlayingEmbed } from '../../classes/Jukebox/EmbedBuilders';
import { JukeboxStatus, StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';
import { getSearchType } from '../../functions/getSearchType';
import { Loggers } from '../../global/Loggers';
import {
    InvalidSearch,
    InvalidSearchSources,
    MapSearchSourceToTypes,
    SearchSources,
    SpotifySearchTypes,
    ValidSearchSources,
    YouTubeSearchTypes,
} from '../../types/Searches';
import { Shuffle } from './shuffle';

export class Play extends Command {
    public name = `play`;
    public description = `Play a song, or add it to the queue`;

    public build(): SlashCommandBuilder {
        const cmd = super.build();

        cmd.addStringOption((option) =>
            option.setName(`song`).setDescription(`The song name or YouTube/Spotify URL`).setRequired(true),
        );

        cmd.addBooleanOption((option) =>
            option.setName(`shuffle`).setDescription(`Shuffle results before adding (if playlist)`),
        );

        return cmd;
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const searchTerm = interaction.options.get(`song`, true).value;
        const doShuffle = !!interaction.options.get(`shuffle`, false)?.value;

        if (typeof searchTerm !== `string`) {
            await interaction.reply({ content: `Please specify a song name or URL`, ephemeral: true });
            return;
        }

        const search = getSearchType(searchTerm);
        if (!search.valid) {
            search.source;
            await interaction.reply({ content: this.invalidSearchMessage(search), ephemeral: true });
            return;
        }

        if (interaction.member.voice.channel === null) {
            await interaction.reply({ content: `You must be in voice to use this command`, ephemeral: true });
            return;
        }

        if (interaction.member.voice.channel.joinable === false) {
            await interaction.reply({
                content: `I cannot join <#${interaction.member.voice.channelId}> `,
                ephemeral: true,
            });
            return;
        }

        const jukebox = jukebot.getOrMakeJukebox({
            interaction,
            voiceChannel: interaction.member.voice.channel,
            search,
            searchTerm,
        });

        let results: HopperResult<ValidSearchSources, MapSearchSourceToTypes<ValidSearchSources>>;

        await interaction.reply({ content: `Getting search results...` });

        try {
            results = await new Hopper({
                interaction,
                search,
                searchTerm,
                maxItems: jukebox.freeSpace,
            }).fetchResults();

            if (results.items.length === 0) {
                throw new Error(`No results found`);
            }
        } catch (error) {
            if (error instanceof Error) {
                await interaction.editReply({ content: error.message });
                return;
            }

            if (error instanceof HopperError) {
                await interaction.editReply({ content: error.toString() });
                return;
            }

            await interaction.editReply({ content: `Unknown error occurred while searching for results` });
            Loggers.error.log(`Search result error`, { error, search });
            return;
        }

        if (doShuffle && results.items.length > 2) {
            Shuffle.inPlaceShuffle(results.items);
        }

        jukebox.inventory.push(...results.items);

        if (jukebox.status.tier !== StatusTiers.Active) {
            // jukebox not active, so
            const res = await jukebox.playNextInQueue(interaction);
            const newStatus = jukebox.status as JukeboxStatus; // it's no longer guaranteed to be inactive

            if (results.playlistMetadata !== undefined) {
                // if a playlist was queued

                if (newStatus.tier === StatusTiers.Active) {
                    // and is now being played
                    // show hybrid embed
                    await interaction.editReply({ content: makeHybridEmbed(newStatus, jukebox, results, search) });
                } else {
                    // but is not being played
                    // meaning something went wrong, so show whatever the response is
                    await interaction.editReply(res);
                }
            } else {
                // a single item was queued
                if (newStatus.tier === StatusTiers.Active) {
                    // and is now being played
                    // show now "playing embed"
                    await interaction.editReply({ content: makeNowPlayingEmbed(newStatus) });
                } else {
                    // but is not being played
                    // meaning something went wrong, so show whatever the response is
                    await interaction.editReply(res);
                }
            }
        } else {
            // jukebox was active, so we definitely aren't playing what was literally just added
            // therefore make "added to queue" embed
            await interaction.editReply({ content: makeAddedToQueueEmbed(jukebox, results, search) });
        }
    }

    private invalidSearchMessage(search: InvalidSearch<SearchSources>): string {
        switch (search.source) {
            case InvalidSearchSources.Invalid:
                return `Invalid URL`;
            case InvalidSearchSources.Unknown:
                return `Unrecognized URL, must be from either Spotify or YouTube`;
            case ValidSearchSources.Text:
                return `Search must be greater than 3 characters`;
            case ValidSearchSources.Spotify:
                switch (search.type) {
                    case SpotifySearchTypes.Album:
                        return `Invalid Spotify album URL`;
                    case SpotifySearchTypes.Playlist:
                        return `Invalid Spotify playlist URL`;
                    case SpotifySearchTypes.Track:
                        return `Invalid Spotify track URL`;
                    default:
                        return `Unrecognized Spotify URL`;
                }
            case ValidSearchSources.YouTube:
                switch (search.type) {
                    case YouTubeSearchTypes.Playlist:
                        return `Invalid YouTube playlist URL`;
                    case YouTubeSearchTypes.Video:
                        return `Invalid YouTube video URL`;
                    default:
                        return `Unrecognized YouTube URL`;
                }
            default:
                Loggers.error.log(`Unrecognized search source`, { search });
                return `Unrecognized search`;
        }
    }
}
