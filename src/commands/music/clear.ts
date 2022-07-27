import { Command, CommandParams } from '../../classes/template/Command';

export class Clear extends Command {
    public name = `clear`;
    public description = `Clear the queue`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.inventory.length === 0) {
            await interaction.reply({ content: `Queue is empty` });
            return;
        }

        const numCleared = jukebox.inventory.length;
        jukebox.inventory = [];
        await interaction.reply({
            content: `Cleared **${numCleared}** song${numCleared !== 1 ? `s` : ``} from the queue`,
        });
    }
}
