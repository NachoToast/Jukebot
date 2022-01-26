/* eslint-disable @typescript-eslint/no-empty-function */

import { SlashCommandBuilder } from '@discordjs/builders';
import { BaseCommandInteraction } from 'discord.js';
import Client from '../client/Client';

export interface CommandParams {
    interaction: BaseCommandInteraction;
    client: Client;
}

export default abstract class Command {
    public abstract name: string;
    public abstract description: string;
    public abstract build(): SlashCommandBuilder;
    public abstract execute({ interaction, client }: CommandParams): Promise<void>;
}
