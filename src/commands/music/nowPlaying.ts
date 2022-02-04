import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';

export class NowPlaying extends Command {
    public name = 'nowplaying';
    public description = "Get the currently playing song's info";
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        if (!jukebox) {
            await interaction.reply({ content: Messages.NotPlaying, ephemeral: true });
            return;
        }

        await interaction.reply(jukebox.nowPlaying);
    }
}

export default new NowPlaying();
