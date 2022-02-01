// import { SlashCommandBuilder } from '@discordjs/builders';
// import {
//     joinVoiceChannel,
//     createAudioResource,
//     StreamType,
//     createAudioPlayer,
//     AudioPlayerStatus,
// } from '@discordjs/voice';
// import ytdl from 'ytdl-core';
// import Command, { CommandParams } from '../../types/Command';

// export class MusicText extends Command {
//     public name = 'musictest';
//     public description = 'Test command';
//     public build(): SlashCommandBuilder {
//         return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
//     }

//     // eslint-disable-next-line class-methods-use-this
//     public execute({ interaction }: CommandParams): void {
//         if (!interaction.member.voice.channelId) return;
//         const connection = joinVoiceChannel({
//             channelId: interaction.member.voice.channelId,
//             guildId: interaction.guildId,
//             adapterCreator: interaction.guild.voiceAdapterCreator,
//         });

//         const stream = ytdl('https://www.youtube.com/watch?v=V_QY0iwaMtA', { filter: 'audioonly' });
//         const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
//         const player = createAudioPlayer();

//         player.play(resource);
//         connection.subscribe(player);

//         player.on(AudioPlayerStatus.Idle, () => connection.destroy());
//     }
// }

// export default new MusicText();
