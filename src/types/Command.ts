import {
    ChatInputCommandInteraction,
    Client,
    GuildMember,
    GuildTextBasedChannel,
    SlashCommandBuilder,
} from 'discord.js';
import { Observer } from '../classes';

interface CommandParams {
    client: Client<true>;
    interaction: ChatInputCommandInteraction;
    channel: GuildTextBasedChannel;
    member: GuildMember;
    observer: Observer;
}

export interface Command {
    name: string;
    description: string;
    execute: (params: CommandParams) => Promise<void>;
    build?: (baseCommand: SlashCommandBuilder) => void;
}
