import { StatusTiers } from '../../classes/Jukebox/types';
import { Command, CommandParams } from '../../classes/template/Command';

export class Skip extends Command {
    public name = `skip`;
    public description = `Skip the current song`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.status.tier !== StatusTiers.Active) {
            await interaction.reply({ content: `Not currently playing anything` });
            return;
        }

        await interaction.reply({ content: `Skipping...` });

        const res = await jukebox.playNextInQueue(interaction);

        await interaction.editReply(res);
    }
}
