import {
    ChatInputCommandInteraction,
    Client,
    Guild,
    GuildMember,
    GuildTextBasedChannel,
    SlashCommandBuilder,
} from 'discord.js';

interface CommandParams {
    client: Client<true>;
    interaction: ChatInputCommandInteraction;
    channel: GuildTextBasedChannel;
    guild: Guild;
    member: GuildMember;
}

export interface Command {
    name: string;
    description: string;
    execute: (params: CommandParams) => Promise<void>;
    build?: (baseCommand: SlashCommandBuilder) => void;
}
