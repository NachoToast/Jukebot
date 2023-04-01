import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CommandParams } from '../../types/CommandParams';
import { Command } from '../Command';

export class Source extends Command {
    public readonly name = 'source';
    public readonly description = 'Get a link to my source code';

    public override async execute({ interaction }: CommandParams): Promise<void> {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Sauce')
                .setStyle(ButtonStyle.Link)
                .setURL('https://github.com/NachoToast/Jukebot'),
        );

        await interaction.reply({ content: "📁 Here's my source code!", components: [row] });
    }

    public override build() {
        return super.build().setDMPermission(true);
    }
}
