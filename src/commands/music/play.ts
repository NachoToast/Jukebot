import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';
import { FullInteraction, GuildedInteraction } from '../../types/Interactions';

export class Play extends Command {
    public name = 'play';
    public description = 'Add a song to the queue.';
    public build(): SlashCommandBuilder {
        const cmd = new SlashCommandBuilder().setName(this.name).setDescription(this.description);

        cmd.addStringOption((option) => option.setName('song').setDescription('The song to add').setRequired(true));

        cmd.addBooleanOption((option) =>
            option.setName('shuffle').setDescription('Shuffle before adding (if playlist)'),
        );

        return cmd;
    }

    // eslint-disable-next-line class-methods-use-this
    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const guildedInteraction = interaction as GuildedInteraction;

        const existingJukebox = jukebot.getJukebox(guildedInteraction.guildId);

        await interaction.deferReply({ ephemeral: false });
        // if already playing audio, skip voice channel checks
        if (existingJukebox) {
            await existingJukebox.add(guildedInteraction, true);
            return;
        }

        if (!guildedInteraction.member.voice.channel) {
            await interaction.editReply({ content: Messages.NotInVoice });
            return;
        }

        const fullInteraction = interaction as FullInteraction;

        try {
            const jukeBox = jukebot.getOrMakeJukebox(fullInteraction);
            await jukeBox.add(guildedInteraction, true);
        } catch (error) {
            await interaction.editReply({ content: `${error}` });
            return;
        }
    }
}

export default new Play();
