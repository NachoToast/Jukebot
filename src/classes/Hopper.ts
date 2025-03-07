import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    CollectorFilter,
    EmbedBuilder,
    GuildMember,
    MessageComponentInteraction,
    BaseMessageOptions,
    TextChannel,
} from 'discord.js';
import { JukebotGlobals } from '../global';
import { errorMessages } from '../messages';
import { withPossiblePlural } from '../util';
import { MusicDisc } from './MusicDisc';

/** Represents a queue of MusicDiscs. */
export class Hopper {
    private static readonly _icon =
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/e/e2/Hopper_%28D%29_JE8.png/revision/latest';

    /**
     * The maximum number of items that can be in the hopper at any given time.
     *
     * This is not actually respected when {@link addItems adding items} to the Hopper.
     */
    private readonly _maxSize: number;

    public constructor(maxSize: number = JukebotGlobals.config.maxQueueSize) {
        this._maxSize = maxSize;
    }

    private _inventory: MusicDisc[] = [];

    public isFull(): boolean {
        return this._inventory.length >= this._maxSize;
    }

    public getFreeSlots(): number {
        return this._maxSize - this._inventory.length;
    }

    public getNext(): MusicDisc | undefined {
        return this._inventory.shift();
    }

    public addItems(items: MusicDisc[], startIndex?: number): void {
        if (startIndex !== undefined) this._inventory.splice(startIndex, 0, ...items);
        else this._inventory.push(...items);
    }

    public removeItems(startIndex: number, deleteCount?: number): MusicDisc[] {
        return this._inventory.splice(startIndex, deleteCount);
    }

    public clear(): void {
        this._inventory = [];
    }

    public shuffle(): void {
        this._inventory.sort(() => Math.random() - 0.5);
    }

    public getSize(): number {
        return this._inventory.length;
    }

    public getDuration(): number {
        return this._inventory.reduce((sum, disc) => sum + disc.durationSeconds, 0);
    }

    /** Adds queue size and duration to the footer of an embed. */
    public addQueueInformationToEmbed(embed: EmbedBuilder): void {
        const size = this.getSize();
        const duration = this.getDuration();

        if (size === 0) return;

        embed.setFooter({
            text: `${withPossiblePlural(size, 'song')} queued (${Hopper.formatDuration(duration)})`,
            iconURL: Hopper._icon,
        });
    }

    public makeQueueEmbed(
        interaction: ChatInputCommandInteraction,
        channel: TextChannel,
        member: GuildMember,
    ): BaseMessageOptions {
        let page = 1;

        const firstPageId = interaction.id + '-first';
        const previousPageId = interaction.id + '-previous';
        const currentPageId = interaction.id + '-current';
        const nextPageId = interaction.id + '-next';
        const lastPageId = interaction.id + '-last';

        const validIds = new Set([nextPageId, previousPageId, firstPageId, lastPageId]);

        const embed = new EmbedBuilder().setColor(JukebotGlobals.config.embedColour);

        const firstPageButton = new ButtonBuilder()
            .setCustomId(firstPageId)
            .setLabel('<<')
            .setStyle(ButtonStyle.Primary);

        const previousPageButton = new ButtonBuilder()
            .setCustomId(previousPageId)
            .setLabel('<')
            .setStyle(ButtonStyle.Primary);

        const currentPageButton = new ButtonBuilder()
            .setCustomId(currentPageId)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const nextPageButton = new ButtonBuilder().setCustomId(nextPageId).setLabel('>').setStyle(ButtonStyle.Primary);

        const lastPageButton = new ButtonBuilder().setCustomId(lastPageId).setLabel('>>').setStyle(ButtonStyle.Primary);

        const editOrCreateResponse = (): BaseMessageOptions => {
            const size = this.getSize();
            const numPages = Math.ceil(size / 10);

            if (size === 0) return { content: errorMessages.emptyQueue, embeds: [], components: [] };

            if (page > numPages) page = numPages;

            embed.setTitle(
                `${withPossiblePlural(size, 'Song')} Queued (Total Length: ${Hopper.formatDuration(
                    this.getDuration(),
                )})`,
            );

            const songs = this._inventory.slice((page - 1) * 10, page * 10);
            const description = songs
                .map((disc, index) => disc.getShortDescription((page - 1) * 10 + index + 1))
                .join('\n');
            const cumulativeDuration = this._inventory
                .slice(0, page * 10)
                .reduce((sum, disc) => sum + disc.durationSeconds, 0);

            embed.setDescription(description).setFooter({
                text: `${(page - 1) * 10 + 1} - ${Math.min(page * 10, size)} of ${size} (${Hopper.formatDuration(
                    cumulativeDuration,
                )})`,
                iconURL: Hopper._icon,
            });

            if (numPages > 1) {
                const row = new ActionRowBuilder<ButtonBuilder>();

                // first page
                if (numPages > 3) {
                    row.addComponents(firstPageButton);
                    firstPageButton.setDisabled(page === 1);
                }

                // previous, current, and next page
                row.addComponents(previousPageButton, currentPageButton, nextPageButton);
                previousPageButton.setDisabled(page === 1);
                currentPageButton.setLabel(`Page ${page}/${numPages}`);
                nextPageButton.setDisabled(page === numPages);

                // last page
                if (numPages > 3) {
                    row.addComponents(lastPageButton);
                    lastPageButton.setDisabled(page === numPages);
                }

                return { embeds: [embed], components: [row] };
            }

            return { embeds: [embed], components: [] };
        };

        const filter: CollectorFilter<[MessageComponentInteraction<'cached'>]> = (i) => validIds.has(i.customId);

        const collector = channel.createMessageComponentCollector({
            filter,
            time: JukebotGlobals.config.timeoutThresholds.stopMessageListeners * 1_000,
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== member.id) {
                await i.reply({ content: 'You can only use your own queue buttons!', ephemeral: true });
                return;
            }

            switch (i.customId) {
                case nextPageId:
                    page++;
                    break;
                case previousPageId:
                    page--;
                    break;
                case firstPageId:
                    page = 1;
                    break;
                case lastPageId:
                    page = Math.ceil(this.getSize() / 10);
                    break;
            }

            const response = editOrCreateResponse();
            await i.update(response);
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });

        return editOrCreateResponse();
    }

    public static formatDuration(durationSeconds: number): string {
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = Math.floor(durationSeconds % 60);

        const hoursString = hours > 0 ? `${hours}:` : '';
        const minutesString = `${minutes}`.padStart(2, '0');
        const secondsString = `${seconds}`.padStart(2, '0');

        return `${hoursString}${minutesString}:${secondsString}`;
    }
}
