import { ChatInputCommandInteraction, Client, GuildMember, SlashCommandBuilder, TextChannel } from 'discord.js';
import { Observer } from '../classes';

interface CommandParams {
    client: Client<true>;
    interaction: ChatInputCommandInteraction;
    channel: TextChannel;
    member: GuildMember;
    observer: Observer;
}

export interface Command {
    name: string;
    description: string;
    execute: (params: CommandParams) => Promise<void>;
    build?: (baseCommand: SlashCommandBuilder) => void;
}
