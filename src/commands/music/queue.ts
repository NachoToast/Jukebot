import { Jukebox } from '../../classes/Jukebox';
import { Command, CommandParams } from '../../classes/template/Command';
import { JukebotInteraction } from '../../types/JukebotInteraction';

export class Queue extends Command {
    public name = `queue`;
    public description = `See the currently queued songs`;

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        return await this.makeQueueEmbed(interaction, jukebox);
    }

    /**
     * Creates and sends an embed which information about the queued songs.
     *
     * This embed also supports pagination for long queues, implemented using
     * button components which listen for a
     * {@link Config.timeoutThresholds.stopQueuePagination configured} amount of time.
     *
     * @param {JukebotInteraction} interaction Interaction to respond to.
     * @param {Jukebox} [jukebox] Jukebox to get queue from, does not need to be playing anything,
     * and can even be undefined since its the same as the queue being empty.
     */
    public async makeQueueEmbed(interaction: JukebotInteraction, jukebox?: Jukebox): Promise<void> {
        if (jukebox === undefined || jukebox.inventory.length === 0) {
            await interaction.reply({ content: `Nothing is currently queued` });
            return;
        }

        const items = jukebox.inventory
            .slice(0, 10)
            .map(({ title, durationString }, i) => `${i + 1}. **${title}** (${durationString})`);

        if (jukebox.inventory.length > 10) {
            items.push(`... *+${jukebox.inventory.length - 10} more*`);
        }

        await interaction.reply({ content: items.join(`\n`) });
    }
}
