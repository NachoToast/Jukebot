import { Command, CommandParams } from '../../classes/template/Command';
import { ValidYouTubeSearch, SearchSources, YouTubeSubtypes } from '../../types/SearchTypes';

export class PlayLagTrainPlease extends Command {
    public name = `playlagtrainplease`;
    public description = `Plays lag train (please)`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const searchTerm = `https://youtu.be/UnIhRpIT7nc`

        const search: ValidYouTubeSearch = {
            source: SearchSources.YouTube,
            type: YouTubeSubtypes.Video,
            valid: true,
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

}
