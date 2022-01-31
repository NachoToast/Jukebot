import { SlashCommandBuilder } from '@discordjs/builders';
import { Jukebot } from '../client/Client';
import { GuildedInteraction } from './Interactions';

export interface CommandParams {
    interaction: GuildedInteraction;
    jukebot: Jukebot;
}

export default abstract class Command {
    public abstract name: string;
    public abstract description: string;

    /** If true, this command can be executed from a DM. */
    public allowNoGuild = false;
    public abstract build(client: Jukebot): SlashCommandBuilder;
    public abstract execute({ interaction, jukebot }: CommandParams): Promise<void>;
}
