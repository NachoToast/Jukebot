import { ChatInputCommandInteraction, Client, Guild, GuildMember, GuildTextBasedChannel } from 'discord.js';

export interface CommandParams {
    client: Client<true>;
    clientVersion: string;
    interaction: ChatInputCommandInteraction<'cached' | 'raw'>;
    channel: GuildTextBasedChannel;
    guild: Guild;
    member: GuildMember;
}
