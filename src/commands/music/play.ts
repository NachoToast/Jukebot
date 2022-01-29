import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';
import { FullInteraction, GuildedInteraction } from '../../types/Interactions';

export class Play extends Command {
    public name = 'play';
    public description = 'Add a song to the queue';
    public build(): SlashCommandBuilder {
        const cmd = new SlashCommandBuilder().setName(this.name).setDescription(this.description);

        cmd.addStringOption((option) => option.setName('song').setDescription('the song to add').setRequired(true));

        return cmd;
    }

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({ content: Messages.GuildOnly, ephemeral: true });
            return;
        }
        const guildedInteraction = interaction as GuildedInteraction;

        const existingJukebox = jukebot.getJukebox(guildedInteraction);

        // if already playing audio, skip voice channel checks
        if (existingJukebox) {
            await existingJukebox.add(guildedInteraction);
            return;
        }

        if (!guildedInteraction.member.voice.channel) {
            await interaction.reply({ content: Messages.NotInVoice, ephemeral: true });
            return;
        }

        const fullInteraction = interaction as FullInteraction;

        const jukeBox = jukebot.getOrMakeJukebox(fullInteraction);
        await jukeBox.add(guildedInteraction);
    }
}

export default new Play();
