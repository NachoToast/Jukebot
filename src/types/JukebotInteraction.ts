import { CommandInteraction, Guild, GuildMember, GuildTextBasedChannel } from 'discord.js';

export interface JukebotInteraction extends CommandInteraction<`cached` | `raw`> {
    member: GuildMember;
    guild: Guild;
    channel: GuildTextBasedChannel;
}
