import { CommandParams, Command } from '../../classes/template/Command';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Loggers } from '../../global/Loggers';

export class Source extends Command {
    public name = `source`;
    public description = `Get a link to my source code`;

    public async execute({ interaction }: CommandParams): Promise<void> {
        try {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel(`Sauce`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://github.com/NachoToast/Jukebot`),
            );

            await interaction.reply({ content: `📁 Here's my source code!`, components: [row], ephemeral: true });
        } catch (error) {
            Loggers.error.log(`Unable to send source code button`, {
                server: `${interaction.guild?.name || `Unknown Guild`} (${interaction.guild?.id || `Unknown ID`})`,
                channel: `${interaction.channel?.name || `Unknown Channel`} ${interaction.channel?.id ?? `Unknown ID`}`,
                author: `${interaction.user.username} ${interaction.user.id}`,
                interaction: interaction.id,
            });
            await interaction.reply({
                content: `Source code: <https://github.com/NachoToast/Jukebot>`,
                ephemeral: true,
            });
        }
    }
}
