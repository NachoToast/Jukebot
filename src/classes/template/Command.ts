import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { Jukebot } from '../Jukebot';

export interface CommandParams {
    interaction: CommandInteraction<'cached' | 'raw'>;
    jukebot: Jukebot;
}

export abstract class Command {
    public abstract readonly name: string;
    public abstract readonly description: string;

    public async execute(params: CommandParams): Promise<void> {
        await params.interaction.reply({ content: 'Not yet implemented', ephemeral: true });
    }

    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }
}
