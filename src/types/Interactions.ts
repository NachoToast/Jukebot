import { BaseCommandInteraction, Guild, GuildMember, TextChannel, VoiceBasedChannel, VoiceState } from 'discord.js';

export interface GuildedInteraction extends BaseCommandInteraction {
    guildId: string;
    guild: Guild & { me: GuildMember };
    member: GuildMember;
    channel: TextChannel;
}

interface VoiceInChannel extends VoiceState {
    channel: VoiceBasedChannel;
    channelId: string;
}

interface MemberInVoice extends GuildMember {
    voice: VoiceInChannel;
}

export interface FullInteraction extends GuildedInteraction {
    member: MemberInVoice;
}
