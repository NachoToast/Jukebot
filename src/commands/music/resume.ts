import { Jukebox } from '../../classes/Jukebox';
import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';

export class Resume extends Command {
    public name = `resume`;
    public description = `Resumes the current song`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.status.tier !== StatusTiers.Idle) {
            await interaction.reply({ content: `Nothing is currently paused` });
            return;
        }

        if (!Jukebox.getHasListenersInVoice(jukebox.voiceChannel)) {
            await interaction.reply({ content: `Cannot resume until there are people listening in VC` });
            return;
        }

        if (jukebox.status.player.unpause()) {
            await interaction.reply({ content: `Unpaused` });
        } else {
            jukebox.logError(`Unknown error occurred trying to manually unpause`);
            await interaction.editReply({ content: `Unknown error occurred trying to unpause` });
        }
    }
}

export class Unpause extends Resume {
    public name = `unpause`;
}
