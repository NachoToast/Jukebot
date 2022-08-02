import { Command, CommandParams } from '../../classes/template/Command';

export class Shuffle extends Command {
    public name = `shuffle`;
    public description = `Shuffle the queue`;

    public async execute({ interaction, jukebot }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);

        if (jukebox === undefined || jukebox.inventory.length === 0) {
            await interaction.reply({ content: `Nothing is currently queued` });
            return;
        }

        if (jukebox.inventory.length < 2) {
            await interaction.reply({ content: `Shuffling requires at least 2 queued songs` });
            return;
        }

        Shuffle.inPlaceShuffle(jukebox.inventory);
        await interaction.reply({ content: `Shuffled ${jukebox.inventory.length} songs` });
    }

    public static inPlaceShuffle(arr: unknown[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
