import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';

export class Clear extends Command {
    public name = 'clear';
    public description = 'Clear the queue';
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        if (!jukebox) {
            await interaction.reply({ content: Messages.NotPlaying, ephemeral: true });
            return;
        }

        const numCleared = jukebox.clear();
        await interaction.reply({
            content: `Cleared **${numCleared}** song${numCleared !== 1 ? 's' : ''} from the queue`,
        });
    }
}

export default new Clear();
