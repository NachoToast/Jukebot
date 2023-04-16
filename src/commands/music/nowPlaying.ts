import { EntityManager } from '../../classes';
import { Command } from '../../types';

export const nowPlayingCommand: Command = {
    name: 'nowplaying',
    description: 'Gets information about the currently playing song',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = await EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined || jukebox.state.status !== 'active') {
            await interaction.reply({ content: 'Nothing is currently playing' });
            return;
        }

        await interaction.reply({ embeds: [jukebox.makeNowPlayingEmbed(jukebox.state)] });
    },
};
