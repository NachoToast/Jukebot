import { channelMention } from 'discord.js';
import { Jukebox } from '../../classes';
import { Command } from '../../types';

export const leaveCommand: Command = {
    name: 'leave',
    description: 'Makes the bot leave the voice channel it is currently in',
    execute: async function ({ interaction, member, guild }): Promise<void> {
        const jukebox = Jukebox.getJukebox(guild.id);
        const jukeboxChannel = jukebox?.getTargetVoiceChannel();

        if (jukebox === undefined || jukeboxChannel === undefined) {
            await interaction.reply({ content: 'I am not in a voice channel' });
            return;
        }

        if (
            jukebox.getHasListenersInVoice() &&
            !(jukeboxChannel.members.size === 2 && jukeboxChannel.id === member.voice.channel?.id)
        ) {
            // if people other than the bot in VC, don't leave
            // unless the only other person is the invoking user
            await interaction.reply({
                content: `Cannot leave while there are listeners in ${channelMention(jukeboxChannel.id)}`,
            });
            return;
        }

        jukebox.destroyConnection();
        await interaction.reply({ content: `Left ${channelMention(jukeboxChannel.id)}` });
    },
};
