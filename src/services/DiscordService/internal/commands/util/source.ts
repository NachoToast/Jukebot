import type { ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../Command";

export const sourceCommand: Command = {
	name: "source",

	description: "Creates a link to Jukebot's source code",

	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.reply({ content: "https://github.com/NachoToast/Jukebot" });
	},
};
