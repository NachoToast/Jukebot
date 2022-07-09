import { CommandInteraction, GuildMember } from 'discord.js';

export interface JukebotInteraction extends CommandInteraction<`cached` | `raw`> {
    member: GuildMember;
}
