import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';

export class Shuffle extends Command {
    public name = 'shuffle';
    public description = 'Shuffle the queue';
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        if (!jukebox) {
            await interaction.reply({ content: Messages.NotPlaying, ephemeral: true });
            return;
        }

        if (jukebox.queueLength < 2) {
            await interaction.reply({ content: 'Shuffling requires at least 2 songs', ephemeral: true });
            return;
        }

        jukebox.shuffle();
        interaction.reply({ content: `Shuffled ${jukebox.queueLength} songs` });
    }
}

export default new Shuffle();
