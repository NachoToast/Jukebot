import { SlashCommandBuilder } from '@discordjs/builders';
import { Command, CommandParams } from '../../classes/template/Command';
import { getSearchType } from '../../functions/getSearchType';
import { InvalidSearch, SearchSources, SpotifySubtypes, YouTubeSubtypes } from '../../types/SearchTypes';

export class Play extends Command {
    public name = `play`;
    public description = `Play a song, or add it to the queue`;

    public build(): SlashCommandBuilder {
        const cmd = super.build();

        cmd.addStringOption((option) =>
            option.setName(`song`).setDescription(`The song name or URL`).setRequired(true),
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

        const res = await jukebox.playSearchFromInactive(
            {
                interaction,
                maxItems: jukebox.freeSpace,
                search,
                searchTerm,
            },
            interaction,
        );

        if (interaction.deferred) {
            await interaction.editReply(res);
        } else await interaction.reply(res);
    }

    private invalidSearchMessage(search: InvalidSearch): string {
        switch (search.source) {
            case SearchSources.Invalid:
                return `There seems to be an error with this URL`;
            case SearchSources.Unknown:
                return `Unrecognized URL, must be from either Spotify or YouTube`;
            case SearchSources.Text:
                return `Search must be greater than 3 characters`;
            case SearchSources.Spotify:
                switch (search.type) {
                    case SpotifySubtypes.Album:
                        return `Invalid Spotify album URL`;
                    case SpotifySubtypes.Playlist:
                        return `Invalid Spotify playlist URL`;
                    case SpotifySubtypes.Track:
                        return `Invalid Spotify track URL`;
                    default:
                        return `Unrecognized Spotify URL`;
                }
            case SearchSources.YouTube:
                switch (search.type) {
                    case YouTubeSubtypes.Playlist:
                        return `Invalid YouTube playlist URL`;
                    case YouTubeSubtypes.Video:
                        return `Invalid YouTube video URL`;
                    default:
                        return `Unrecognized YouTube URL`;
                }
        }
    }
}
