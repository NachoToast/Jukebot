import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CollectorFilter,
    EmbedBuilder,
    MessageComponentInteraction,
} from 'discord.js';
import { Jukebox } from '../../classes/Jukebox';
import { Command, CommandParams } from '../../classes/template/Command';
import { getQueueLength } from '../../functions/getQueueLength';
import { numericalToString } from '../../functions/timeConverters';
import { Config } from '../../global/Config';
import { JukebotInteraction } from '../../types/JukebotInteraction';

export class Queue extends Command {
    public name = `queue`;
    public description = `See the currently queued songs`;

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        const jukebox = jukebot.getJukebox(interaction.guildId);
        return await Queue.makeQueueEmbed(interaction, jukebox);
    }

    private static _itemsPerPage = 10;

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
    public static async makeQueueEmbed(interaction: JukebotInteraction, jukebox?: Jukebox): Promise<void> {
        if (jukebox === undefined || jukebox.inventory.length === 0) {
            await interaction.reply({ content: `The queue is empty` });
            return;
        }

        const title = `${jukebox.inventory.length} Song${jukebox.inventory.length !== 1 ? `s` : ``} Queued`;
        const description: string[] = [];

        let lengthDescription;
        const { totalDuration, numLiveVideos } = getQueueLength(jukebox.inventory);
        if (numLiveVideos > 0) {
            lengthDescription = `Total Length (Excluding ${numLiveVideos} Live Video${
                numLiveVideos !== 1 ? `s` : ``
            }): `;
        } else {
            lengthDescription = `Total Length: `;
        }
        lengthDescription += numericalToString(totalDuration);

        description.push(lengthDescription);
        let page = 1;
        const numPages = Math.ceil(jukebox.inventory.length / Queue._itemsPerPage);

        const nextPageId = `${interaction.id}_next`;
        const prevPageId = `${interaction.id}_prev`;
        const lastPageId = `${interaction.id}_last`;
        const firstPageId = `${interaction.id}_first`;

        const currentPageId = `${interaction.id}_current`;

        const validIds = new Set([nextPageId, prevPageId, lastPageId, firstPageId]);

        const firstPageButton = () =>
            new ButtonBuilder()
                .setCustomId(firstPageId)
                .setLabel(`<<`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1);

        const prevPageButton = () =>
            new ButtonBuilder()
                .setCustomId(prevPageId)
                .setLabel(`<`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1);

        const currentPageButton = () =>
            new ButtonBuilder()
                .setLabel(`Page ${page}`)
                .setStyle(ButtonStyle.Secondary)
                .setCustomId(currentPageId)
                .setDisabled(true);

        const nextPageButton = () =>
            new ButtonBuilder()
                .setCustomId(nextPageId)
                .setLabel(`>`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === numPages);

        const lastPageButton = () =>
            new ButtonBuilder()
                .setCustomId(lastPageId)
                .setLabel(`>>`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === numPages);

        const getItems = (): { embeds: EmbedBuilder[]; components?: ActionRowBuilder<ButtonBuilder>[] } => {
            const embed = new EmbedBuilder().setTitle(title).setColor(Config.embedColor);

            const songs: string[] = [];
            jukebox.inventory
                .slice(Queue._itemsPerPage * (page - 1), Queue._itemsPerPage * page)
                .forEach((disc, index) =>
                    songs.push(
                        `${(page - 1) * Queue._itemsPerPage + index + 1}. ${disc.title} (${
                            disc.live ? `Live` : disc.durationString
                        })`,
                    ),
                );

            embed.setDescription([description.join(`\n`), songs.join(`\n`)].join(`\n`));

            const row = new ActionRowBuilder<ButtonBuilder>();

            if (numPages > 1) {
                if (numPages > 3) {
                    row.addComponents(firstPageButton());
                }
                row.addComponents(prevPageButton(), currentPageButton(), nextPageButton());
                if (numPages > 3) {
                    row.addComponents(lastPageButton());
                }
            }

            if (row.components.length) return { embeds: [embed], components: [row] };
            return { embeds: [embed] };
        };

        const filter: CollectorFilter<[MessageComponentInteraction<`cached`>]> = (i) => validIds.has(i.customId);

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: Config.timeoutThresholds.stopQueuePagination * 1000,
        });

        collector.on(`collect`, async (i) => {
            if (i.customId === firstPageId) {
                page = 1;
            } else if (i.customId === prevPageId) {
                page--;
            } else if (i.customId === nextPageId) {
                page++;
            } else if (i.customId === lastPageId) {
                page = numPages;
            }
            await i.update(getItems());
        });

        collector.on(`end`, async () => {
            await interaction.editReply({ components: [] });
        });

        const items = getItems();
        await interaction.reply(items);
    }
}
