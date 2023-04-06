import { channelMention } from 'discord.js';
import { Jukebox } from '../../classes';
import { Command } from '../../types';

export const debugCommand: Command = {
    name: 'debug',
    description: 'debug information :)',
    execute: async function ({ guild, interaction }): Promise<void> {
        const jukebox = Jukebox.getJukebox(guild.id);
        if (jukebox === undefined) await interaction.reply({ content: 'no bitches' });
        else {
            const output = [
                `target channel: ${channelMention(jukebox['_targetVoiceChannel'].id)}`,
                `connected to target channel: ${!!jukebox.getTargetVoiceChannel()}`,
            ];
            await interaction.reply({ content: output.join('\n') });
        }
    },
};
