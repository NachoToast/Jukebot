import { SlashCommandBuilder } from '@discordjs/builders';
import { Hopper } from '../../classes/Hopper/Hopper';
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
            return await interaction.reply({ content: `Please specify a song name or URL`, ephemeral: true });
        }

        const search = getSearchType(searchTerm);
        if (!search.valid) {
            search.source;
            return await interaction.reply({ content: this.invalidSearchMessage(search), ephemeral: true });
        }

        await interaction.reply({ content: `Searching for results...` });

        const startTime = Date.now();
        const hopper = await new Hopper(interaction, search, searchTerm, 100, jukebot.errorLogger).fetchResults();
        const timeTaken = Date.now() - startTime;
        if (!hopper.success) {
            jukebot.errorLogger.log(hopper.error, { interaction });
            await interaction.editReply({ content: `An unknown error occurred while getting results` });
            return;
        }
        if (!hopper.items.length) {
            await interaction.editReply({ content: `No results found` });
            return;
        }

        await interaction.editReply({
            content: `Added ${hopper.items.length} items to the queue (took ${timeTaken}ms)`,
        });
        console.log(`${hopper.errors.length} errors, ${hopper.items.length} items`);
        for (const e of hopper.errors) {
            console.log(e.toString(false));
        }
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
