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
} from 'discord.js';
import { JukebotGlobals } from '../global';
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

    /** Be sure to check {@link getFreeSlots} and/or {@link isFull} before calling this method. */
    public addItems(items: MusicDisc[], startIndex?: number): void {
        if (startIndex !== undefined) this._inventory.splice(startIndex, 0, ...items.slice(0, this.getFreeSlots()));
        else this._inventory.push(...items.slice(0, this.getFreeSlots()));
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

    public async makeQueueEmbed(interaction: ChatInputCommandInteraction, member: GuildMember): Promise<void> {
        const size = this.getSize();
        const title = `${withPossiblePlural(size, 'Song')} Queued (Total Length: ${Hopper.formatDuration(
            this.getDuration(),
        )})`;

        let page = 1;
        const numPages = Math.ceil(size / 10);

        const nextPageId = interaction.id + '-next';
        const previousPageId = interaction.id + '-previous';
        const firstPageId = interaction.id + '-first';
        const lastPageId = interaction.id + '-last';
        const currentPageId = interaction.id + '-current';

        const validIds = new Set([nextPageId, previousPageId, firstPageId, lastPageId, currentPageId]);

        const firstPageButton = () =>
            new ButtonBuilder()
                .setCustomId(firstPageId)
                .setLabel('<<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1);
        const previousPageButton = () =>
            new ButtonBuilder()
                .setCustomId(previousPageId)
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 1);
        const currentPageButton = () =>
            new ButtonBuilder()
                .setCustomId(currentPageId)
                .setLabel(`Page ${page}/${numPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);
        const nextPageButton = () =>
            new ButtonBuilder()
                .setCustomId(nextPageId)
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === numPages);
        const lastPageButton = () =>
            new ButtonBuilder()
                .setCustomId(lastPageId)
                .setLabel('>>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === numPages);

        const regenerateResponse = (): BaseMessageOptions => {
            const embed = new EmbedBuilder().setColor(JukebotGlobals.config.embedColour).setTitle(title);
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

            const row = new ActionRowBuilder<ButtonBuilder>();

            if (numPages > 1) {
                if (numPages > 3) row.addComponents(firstPageButton());
                row.addComponents(previousPageButton(), currentPageButton(), nextPageButton());
                if (numPages > 3) row.addComponents(lastPageButton());
            }

            return { embeds: [embed], components: [row] };
            // if (row.components.length > 0)
            // else return { embeds: [embed], components: [] };
        };

        const filter: CollectorFilter<[MessageComponentInteraction<'cached'>]> = (i) => validIds.has(i.customId);

        const collector = interaction.channel?.createMessageComponentCollector({
            filter,
            time: JukebotGlobals.config.timeoutThresholds.stopMessageListeners * 1_000,
        });

        collector?.on('collect', async (i) => {
            if (i.user.id !== member.id) {
                await i.reply({ content: 'You can only use your own queue buttons!', ephemeral: true });
                return;
            }

            if (i.customId === nextPageId) page++;
            else if (i.customId === previousPageId) page--;
            else if (i.customId === firstPageId) page = 1;
            else if (i.customId === lastPageId) page = numPages;

            const response = regenerateResponse();
            await i.update(response);
        });

        collector?.on('end', async () => {
            await interaction.editReply({ components: [] });
        });

        await interaction.reply(regenerateResponse());
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
