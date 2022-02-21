import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';

export class Fix extends Command {
    public name = 'fix';
    public description = "Fixes Jukebot if it's stuck in a voice channel or something";
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        if (!jukebox) {
            await interaction.reply({ content: Messages.NotPlaying, ephemeral: true });
            return;
        }

        jukebot.removeJukebox(interaction.guildId);
        await interaction.reply({ content: 'Fix attempted, please contact NachoToast if problems persist' });
    }
}

export default new Fix();
