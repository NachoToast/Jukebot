import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageActionRow, MessageButton } from 'discord.js';
import Command, { CommandParams } from '../../types/Command';

export class Source extends Command {
    public name = 'source';
    public description = 'Get a link to my source code';
    public allowNoGuild = true;
    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    public async execute({ interaction }: CommandParams): Promise<void> {
        const row = new MessageActionRow().addComponents(
            new MessageButton().setLabel('Sauce').setStyle('LINK').setURL('https://github.com/NachoToast/Jukebot'),
        );

        await interaction.reply({ content: "📁 Here's my source code!", components: [row], ephemeral: true });
    }
}

export default new Source();
