import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';

export class Queue extends Command {
    public name = 'queue';
    public description = 'See the currently queued songs';
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        if (!jukebox) {
            await interaction.reply({ content: Messages.NotPlaying, ephemeral: true });
            return;
        }

        await interaction.deferReply();
        await jukebox.getQueueEmbed(interaction);
    }
}

export default new Queue();
