import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';

export class Leave extends Command {
    public name = 'leave';
    public description = 'Leave the voice chat (and clear the queue)';
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        if (!jukebox) {
            await interaction.reply({ content: Messages.SelfNotInVoice, ephemeral: true });
            return;
        }

        jukebox.cleanup();
        await interaction.reply({ content: '👋' });
    }
}

export default new Leave();
