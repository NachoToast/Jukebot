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
            await interaction.reply({ content: Messages.GuildOnly, ephemeral: false });
            return;
        }
        const guildedInteraction = interaction as GuildedInteraction;

        const existingJukebox = jukebot.getJukebox(guildedInteraction);

        await interaction.deferReply({ ephemeral: false });
        // if already playing audio, skip voice channel checks
        if (existingJukebox) {
            const res = await existingJukebox.add(guildedInteraction);
            if (res.failure) {
                await interaction.editReply({ content: res.reason });
            } else {
                await interaction.editReply({ ...res.output });
            }
            return;
        }

        if (!guildedInteraction.member.voice.channel) {
            await interaction.editReply({ content: Messages.NotInVoice });
            return;
        }

        const fullInteraction = interaction as FullInteraction;

        const jukeBox = jukebot.getOrMakeJukebox(fullInteraction);
        const res = await jukeBox.add(guildedInteraction);
        if (res.failure) {
            await interaction.editReply({ content: res.reason });
        } else {
            await interaction.editReply({ ...res.output });
        }
    }
}

export default new Play();
