import { SlashCommandBuilder } from 'discord.js';
import { CommandParams } from '../types/CommandParams';

export abstract class Command {
    public abstract readonly name: string;
    public abstract readonly description: string;

    public abstract execute({ interaction }: CommandParams): Promise<void>;

    public build(): SlashCommandBuilder {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description).setDMPermission(false);
    }
}
