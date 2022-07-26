import { makeNowPlayingEmbed } from '../../classes/Jukebox/EmbedBuilders';
import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';

export class NowPlaying extends Command {
    public name = `nowplaying`;
    public description = `Get information on the currently playing song`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.status.tier !== StatusTiers.Active) {
            await interaction.reply({ content: `Not currently playing anything` });
            return;
        }

        await interaction.reply({ content: makeNowPlayingEmbed(jukebox.status) });
    }
}
