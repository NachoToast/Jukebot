import { SlashCommandBuilder } from '@discordjs/builders';
import { Hopper } from '../../classes/Hopper';
import { HopperError } from '../../classes/Hopper/Errors';
import { HopperResult } from '../../classes/Hopper/types';
import { makeAddedToQueueEmbed } from '../../classes/Jukebox/EmbedBuilders';
import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';
import { getSearchType } from '../../functions/getSearchType';
import { Loggers } from '../../global/Loggers';
import {
    InvalidSearch,
    InvalidSearchSources,
    SearchSources,
    SpotifySearchTypes,
    TextSearchTypes,
    ValidSearchSources,
    YouTubeSearchTypes,
} from '../../types/Searches';

export class Play extends Command {
    public name = `play`;
    public description = `Play a song, or add it to the queue`;

    public build(): SlashCommandBuilder {
        const cmd = super.build();

        cmd.addStringOption((option) =>
            option.setName(`song`).setDescription(`The song name or YouTube/Spotify URL`).setRequired(true),
        );

        return cmd;
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const searchTerm = interaction.options.get(`song`, true).value;
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

        let results: HopperResult<ValidSearchSources, TextSearchTypes | SpotifySearchTypes | YouTubeSearchTypes>;

        try {
            [results] = await Promise.all([
                new Hopper({
                    interaction,
                    search,
                    searchTerm,
                    maxItems: jukebox.freeSpace,
                }).fetchResults(),
                interaction.reply({ content: `Getting search results...` }),
            ]);

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

        jukebox.inventory.push(...results.items);
        if (jukebox.status.tier !== StatusTiers.Active) {
            const res = await jukebox.playNextInQueue(interaction);
            await interaction.editReply(res);
            return;
        }

        await interaction.editReply({ content: makeAddedToQueueEmbed(jukebox, results, search) });
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
