// import { SlashCommandBuilder } from '@discordjs/builders';
// import Command, { CommandParams } from '../../types/Command';
// import Messages from '../../types/Messages';

// export class NowPlaying extends Command {
//     public name = 'nowplaying';
//     public description = "Get the currently playing song's info";
//     public build(): SlashCommandBuilder {
//         return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
//     }

//     public execute({ interaction, jukebot }: CommandParams): void {
//         const jukebox = jukebot.getJukebox(interaction);
//         if (!jukebox || !jukebox.current.active) {
//             await interaction.reply({ content: Messages.NotPlaying, ephemeral: true });
//             return;
//         }

//         const res = jukebox.getNowPlaying();
//         await interaction.reply({ ...res });

//         // const myinterval = setInterval(async () => {
//         //     await interaction.editReply({ ...jukebox.getNowPlaying() });
//         // }, 2000);

//         // setTimeout(() => {
//         //     clearInterval(myinterval);
//         // }, 1000 * 20);
//     }
// }

// export default new NowPlaying();
