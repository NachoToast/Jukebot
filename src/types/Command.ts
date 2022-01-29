/* eslint-disable @typescript-eslint/no-empty-function */

import { SlashCommandBuilder } from '@discordjs/builders';
import { BaseCommandInteraction } from 'discord.js';
import { Jukebot } from '../client/Client';

export interface CommandParams {
    interaction: BaseCommandInteraction;
    jukebot: Jukebot;
}

export default abstract class Command {
    public abstract name: string;
    public abstract description: string;
    public abstract build(client: Jukebot): SlashCommandBuilder;
    public abstract execute({ interaction, jukebot }: CommandParams): Promise<void>;
}
