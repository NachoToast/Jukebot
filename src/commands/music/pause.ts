import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';

export class Pause extends Command {
    public name = `pause`;
    public description = `Pause the current song`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.status.tier !== StatusTiers.Active) {
            await interaction.reply({ content: `Nothing is currently playing` });
            return;
        }

        if (jukebox.status.player.pause(true)) {
            await interaction.reply({ content: `Paused` });
        } else {
            jukebox.logError(`Unknown error occurred trying to manually pause`);
            await interaction.editReply({ content: `Unknown error occurred trying to pause` });
        }
    }
}
