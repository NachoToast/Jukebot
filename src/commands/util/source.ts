import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageActionRow, MessageButton } from 'discord.js';
import { Jukebot } from '../../client/Client';
import Command, { CommandParams } from '../../types/Command';

export class Source extends Command {
    public name = 'source';
    public description = 'Links to GitHub repo';
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction }: CommandParams): Promise<void> {
        const row = new MessageActionRow().addComponents(
            new MessageButton().setLabel('Sauce').setStyle('LINK').setURL(Jukebot.config.sourceCode),
        );

        await interaction.reply({ content: "Here's my source code!", components: [row], ephemeral: true });
    }
}

export default new Source();
