import type { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";

export interface Command {
	name: Lowercase<string>;

	description: string;

	build?(base: SlashCommandBuilder): void;

	execute(interaction: ChatInputCommandInteraction, member: GuildMember): Promise<void>;
}
