import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';

export class Skip extends Command {
    public name = 'skip';
    public description = 'Skip the current song';
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction);
        if (!jukebox) {
            await interaction.reply({ content: Messages.NotPlaying, ephemeral: true });
            return;
        }

        try {
            await jukebox.skip();

            await interaction.reply({ content: '⏭️ Skipped!', ephemeral: true });
        } catch (error) {
            if (error instanceof Error) {
                await interaction.reply({ content: error.message });
            } else {
                await interaction.reply({ content: 'Unknown error occurred' });
            }
        }
    }
}

export default new Skip();
