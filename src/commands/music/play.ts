import { SlashCommandBuilder } from '@discordjs/builders';
import Command, { CommandParams } from '../../types/Command';
import Messages from '../../types/Messages';
import { FullInteraction, GuildedInteraction } from '../../types/Interactions';
import { Jukebot } from '../../classes/Client';

export class Play extends Command {
    public name = 'play';
    public description = 'Add a song to the queue';
    public build(): SlashCommandBuilder {
        const cmd = new SlashCommandBuilder().setName(this.name).setDescription(this.description);

        cmd.addStringOption((option) => option.setName('song').setDescription('the song to add').setRequired(true));

        return cmd;
    }

    // eslint-disable-next-line class-methods-use-this
    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const guildedInteraction = interaction as GuildedInteraction;

        const existingJukebox = jukebot.getJukebox(guildedInteraction);

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
            const jukeBox = await jukebot.getOrMakeJukebox(fullInteraction);
            await jukeBox.add(guildedInteraction, true);
        } catch (error) {
            await interaction.editReply({
                content: `Failed to connect in reasonable time (${Jukebot.config.readyTimeout} seconds)`,
            });
            return;
        }
    }
}

export default new Play();
