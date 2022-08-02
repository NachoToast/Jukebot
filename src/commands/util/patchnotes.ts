import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CollectorFilter,
    EmbedBuilder,
    MessageComponentInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import moment from 'moment';
import { Command, CommandParams } from '../../classes/template/Command';
import { getVersion } from '../../functions/getVersion';
import { Config } from '../../global/Config';

export class Patchnotes extends Command {
    public name = `patchnotes`;
    public description = `Get my latest patch notes`;

    public build(): SlashCommandBuilder {
        const cmd = super.build();

        cmd.addStringOption((option) =>
            option.setName(`version`).setDescription(`The version to get patch notes for, defaults to latest`),
        );

        cmd.addBooleanOption((option) =>
            option.setName(`list`).setDescription(`List all versions instead of getting patch notes`),
        );

        return cmd;
    }

    public async execute({ jukebot, interaction }: CommandParams): Promise<void> {
        const listMode = !!interaction.options.get(`list`, false)?.value;

        if (listMode) {
            await interaction.reply({
                content: `**${jukebot.releaseObserver.tagSet.size}** Versions: \`${jukebot.releaseObserver.tags.join(
                    `\`, \``,
                )}\``,
            });
            return;
        }

        const targetVersion = interaction.options.get(`version`, false)?.value ?? getVersion();

        if (typeof targetVersion !== `string` || !jukebot.releaseObserver.tagSet.has(targetVersion)) {
            await interaction.reply({ content: `Please specify a valid version` });
            return;
        }

        let targetVersionIndex = jukebot.releaseObserver.tags.indexOf(targetVersion);

        const highestIndex = jukebot.releaseObserver.tagSet.size - 1;
        const tags = jukebot.releaseObserver.tags;

        const firstReleaseId = `${interaction.id}_first`;
        const prevReleaseId = `${interaction.id}prev`;
        const nextReleaseId = `${interaction.id}_next`;
        const lastReleaseId = `${interaction.id}_last`;

        const currentReleaseId = `${interaction.id}_current`;

        const validIds = new Set([firstReleaseId, prevReleaseId, nextReleaseId, lastReleaseId]);

        const lastReleaseButton = () =>
            new ButtonBuilder()
                .setCustomId(firstReleaseId)
                .setLabel(tags[0] ?? `-`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(targetVersionIndex === 0);

        const nextReleaseButton = () =>
            new ButtonBuilder()
                .setCustomId(prevReleaseId)
                .setLabel(tags[targetVersionIndex - 1] ?? tags[0] ?? `-`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(targetVersionIndex === 0);

        const currentReleaseButton = () =>
            new ButtonBuilder()
                .setCustomId(currentReleaseId)
                .setLabel(tags[targetVersionIndex] ?? `-`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

        const prevReleaseButton = () =>
            new ButtonBuilder()
                .setCustomId(nextReleaseId)
                .setLabel(tags[targetVersionIndex + 1] ?? tags[highestIndex] ?? `-`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(targetVersionIndex === highestIndex);

        const firstReleaseButton = () =>
            new ButtonBuilder()
                .setCustomId(lastReleaseId)
                .setLabel(tags[highestIndex] ?? `-`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(targetVersionIndex === highestIndex);

        const getItems = (): { embeds: EmbedBuilder[]; components?: ActionRowBuilder<ButtonBuilder>[] } => {
            const release = jukebot.releaseObserver.releases[jukebot.releaseObserver.tags[targetVersionIndex]];

            const embed = new EmbedBuilder()
                .setColor(Config.embedColor)
                .setURL(release.html_url)
                .setTitle(`Jukebot Version ${release.tag_name}`)
                .setDescription(release.body)
                .setFooter({
                    text: `Released by ${release.author.login} ${moment(release.published_at).fromNow()} (${
                        highestIndex - targetVersionIndex + 1
                    } of ${highestIndex + 1})`,
                    iconURL: release.author.avatar_url,
                });

            const row = new ActionRowBuilder<ButtonBuilder>();

            if (highestIndex > 0) {
                if (highestIndex > 2) {
                    row.addComponents(firstReleaseButton());
                }
                row.addComponents(prevReleaseButton(), currentReleaseButton(), nextReleaseButton());
                if (highestIndex > 2) {
                    row.addComponents(lastReleaseButton());
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
            if (i.customId === firstReleaseId) {
                targetVersionIndex = 0;
            } else if (i.customId === prevReleaseId) {
                targetVersionIndex--;
            } else if (i.customId === nextReleaseId) {
                targetVersionIndex++;
            } else if (i.customId === lastReleaseId) {
                targetVersionIndex = highestIndex;
            }
            await i.update(getItems());
        });

        collector.on(`end`, async () => {
            await interaction.editReply({ components: [] });
        });

        await interaction.reply(getItems());
    }
}
