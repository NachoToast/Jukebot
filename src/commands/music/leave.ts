import { channelMention } from 'discord.js';
import { EntityManager } from '../../classes';
import { Command } from '../../types';

function randomNotInVoiceResponse(): string {
    const choices = [
        'I am not in a voice channel',
        "Please point out the voice channel I am in, I'll wait",
        "It's truly incredible that you think I'm in a voice channel",
        'Do you have eyes lmao',
        '<:2021:794405448266154005>',
        "Why don't you leave instead?",
    ];

    return choices[Math.floor(Math.random() * choices.length)];
}

export const leaveCommand: Command = {
    name: 'leave',
    description: 'Makes the bot leave the voice channel it is currently in',
    execute: async function ({ interaction, member }): Promise<void> {
        const jukebox = EntityManager.getGuildInstance(member.guild.id);

        if (jukebox === undefined) {
            await interaction.reply({ content: randomNotInVoiceResponse() });
            return;
        }

        const jukeboxChannel = jukebox.targetVoiceChannel;

        const onlyOtherListenerIsMe =
            jukeboxChannel.members.size === 2 && jukeboxChannel.id === member.voice.channel?.id;

        if (!onlyOtherListenerIsMe && jukebox.hasAudioListeners()) {
            // if people other than the bot in VC, don't leave
            // unless the only other person is the invoking user
            await interaction.reply({
                content: `Cannot leave while there are listeners in ${channelMention(jukeboxChannel.id)}`,
            });
            return;
        }

        jukebox.destroyInstance();

        await interaction.reply({ content: `Left ${channelMention(jukeboxChannel.id)}` });
    },
};
