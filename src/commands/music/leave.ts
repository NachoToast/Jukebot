import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';

export class Leave extends Command {
    public name = `leave`;
    public description = `Leaves the voice channel`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.status.tier === StatusTiers.Inactive) {
            await interaction.reply({ content: `Not currently in a voice channel` });
            return;
        }

        if (jukebox.status.connection.disconnect()) {
            await interaction.reply({ content: `Left <#${jukebox.voiceChannel.id}>` });
        } else {
            jukebox.logError(`Unknown error occurred trying to manually disconnect`, {
                channel: { id: jukebox.voiceChannel.id, name: jukebox.voiceChannel.name },
            });
            await interaction.editReply({ content: `Unknown error occurred trying to leave` });
        }
    }
}
