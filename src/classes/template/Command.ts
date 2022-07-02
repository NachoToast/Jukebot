import { SlashCommandBuilder } from '@discordjs/builders';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import { Jukebot } from '../Jukebot';

export interface CommandParams {
    interaction: JukebotInteraction;
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
