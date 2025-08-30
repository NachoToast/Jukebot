import { Allay, EntityManager, MusicDisc } from '../../classes';
import { errorMessages } from '../../messages';
import { Command } from '../../types';

const sussyBeats = [
    'https://www.youtube.com/watch?v=3i2FOyu5rDI', // mask
    'https://www.youtube.com/watch?v=NkFrnFooMgk', // mask sus
    'https://www.youtube.com/watch?v=Ow_PNMtMGhU', // roadtrip
    'https://www.youtube.com/watch?v=89dGC8de0CA', // dream on
] as const;

export const dreamCommand: Command = {
    name: 'dream',
    description: 'Dream',
    execute: async function ({ interaction, member, channel }): Promise<void> {
        if (member.voice.channel === null) {
            await interaction.reply({ content: errorMessages.notInVoice });
            return;
        }

        await interaction.reply({ content: 'Dream...' });

        let jukebox = EntityManager.getGuildInstance(member.guild.id);

        let searchTerm;

        if (Math.random() < 0.01) {
            searchTerm = 'https://youtu.be/buLP8f_F-5s?si=blk8irh8mJ4xiWdD'; // huawei texture pack review (RARE)
        } else {
            const index = Math.floor(Math.random() * sussyBeats.length);

            searchTerm = sussyBeats[index];
        }

        const allay = new Allay(interaction, member, channel, searchTerm);

        const result = await allay.retrieveItems();

        jukebox ??= EntityManager.makeGuildInstance(channel, member.voice.channel);

        const embed = allay.makeEmbed(result, jukebox);

        await interaction.editReply({ embeds: [embed] });

        if (result instanceof MusicDisc) {
            jukebox.upcomingQueue.addItems([result], 0);
        } else {
            jukebox.upcomingQueue.addItems(result.items, 0);
        }

        const newState = await jukebox.playNextInQueue(interaction);
        if (
            newState.status === 'active' &&
            newState.currentlyPlaying === result &&
            jukebox.textChannel.id === channel.id
        ) {
            await interaction.editReply({ content: "that's what the point of damascus" });
            return;
        }
    },
};
