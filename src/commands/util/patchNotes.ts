import dayjs, { extend } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
    ActionRowBuilder,
    BaseMessageOptions,
    ButtonBuilder,
    ButtonStyle,
    CollectorFilter,
    EmbedBuilder,
    MessageComponentInteraction,
} from 'discord.js';
import { JukebotGlobals } from '../../global';
import { Command } from '../../types';

extend(relativeTime);

export const patchNotesCommand: Command = {
    name: 'patchnotes',
    description: 'Displays the latest patch notes',
    execute: async function ({ interaction, channel, member, observer }): Promise<void> {
        let tagIndex = 0;

        const oldestReleaseId = `${interaction.id}-oldest`;
        const olderReleaseId = `${interaction.id}-older`;
        const currentReleaseId = `${interaction.id}-current`;
        const laterReleaseId = `${interaction.id}-later`;
        const latestReleaseId = `${interaction.id}-latest`;

        const validIds = new Set([oldestReleaseId, olderReleaseId, laterReleaseId, latestReleaseId]);

        const embed = new EmbedBuilder().setColor(JukebotGlobals.config.embedColour);

        const oldestReleaseButton = new ButtonBuilder().setCustomId(oldestReleaseId).setStyle(ButtonStyle.Primary);

        const olderReleaseButton = new ButtonBuilder().setCustomId(olderReleaseId).setStyle(ButtonStyle.Primary);

        const currentReleaseButton = new ButtonBuilder()
            .setCustomId(currentReleaseId)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const laterReleaseButton = new ButtonBuilder().setCustomId(laterReleaseId).setStyle(ButtonStyle.Primary);

        const latestReleaseButton = new ButtonBuilder().setCustomId(latestReleaseId).setStyle(ButtonStyle.Primary);

        const editOrCreateResponse = (): BaseMessageOptions => {
            const size = observer.tagSet.size;

            if (size === 0) return { content: 'No patch notes found', embeds: [], components: [] };

            if (tagIndex > size - 1) tagIndex = size - 1;
            else if (tagIndex < 0) tagIndex = 0;

            const tag = observer.tags[tagIndex];
            const release = observer.releases[tag];

            embed
                .setTitle(`Jukebot Version ${release.tag_name}`)
                .setURL(release.html_url)
                .setDescription(release.body)
                .setFooter({
                    text: `Released by ${release.author.login} ${dayjs(release.published_at).fromNow()} (${
                        size - tagIndex
                    } of ${size})`,
                    iconURL: release.author.avatar_url,
                });

            const row = new ActionRowBuilder<ButtonBuilder>();

            if (size > 1) {
                // oldest release
                if (size > 3) {
                    row.addComponents(oldestReleaseButton);
                    oldestReleaseButton.setDisabled(tagIndex === size - 1).setLabel(observer.tags[size - 1]);
                }

                // older, current, and later release
                row.addComponents(olderReleaseButton, currentReleaseButton, laterReleaseButton);
                olderReleaseButton
                    .setDisabled(tagIndex === size - 1)
                    .setLabel(observer.tags[tagIndex + 1] ?? observer.tags[size - 1]);
                currentReleaseButton.setLabel(observer.tags[tagIndex]);
                laterReleaseButton
                    .setDisabled(tagIndex === 0)
                    .setLabel(observer.tags[tagIndex - 1] ?? observer.tags[0]);

                // latest release
                if (size > 3) {
                    row.addComponents(latestReleaseButton);
                    latestReleaseButton.setDisabled(tagIndex === 0).setLabel(observer.tags[0]);
                }
            }

            return { embeds: [embed], components: [row] };
        };

        const filter: CollectorFilter<[MessageComponentInteraction<'cached'>]> = (i) => validIds.has(i.customId);

        const collector = channel.createMessageComponentCollector({
            filter,
            time: JukebotGlobals.config.timeoutThresholds.stopMessageListeners * 1_000,
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== member.id) {
                await i.reply({ content: 'You can only use your own release buttons', ephemeral: true });
                return;
            }

            switch (i.customId) {
                case laterReleaseId:
                    tagIndex--;
                    break;
                case olderReleaseId:
                    tagIndex++;
                    break;
                case oldestReleaseId:
                    tagIndex = observer.tagSet.size - 1;
                    break;
                case latestReleaseId:
                    tagIndex = 0;
                    break;
            }

            const response = editOrCreateResponse();
            await i.update(response);
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });

        await interaction.reply(editOrCreateResponse());
    },
};
