import process from "node:process";
import {
	bold,
	type ChatInputCommandInteraction,
	hyperlink,
	TimestampStyles,
	time,
} from "discord.js";
import { config } from "@/config";
import { client } from "../../state";
import type { Command } from "../Command";

function pingHint(ping: number): string {
	if (ping < 500) return "good";
	if (ping < 1000) return "ok";
	if (ping < 2000) return "bad";
	if (ping < 3000) return "very bad";
	return "oh god";
}

function format(ping: number): string {
	return `${Math.abs(Math.round(ping)).toLocaleString()}ms`;
}

export const statusCommand: Command = {
	name: "status",

	description: "Gets information about Jukebot's status",

	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const ping = Date.now() - interaction.createdTimestamp;

		const started = time(config.startTime, TimestampStyles.RelativeTime);

		const memoryUsage = Math.ceil(process.memoryUsage().heapUsed / 1024 ** 2).toLocaleString();

		let title: string;

		if (config.version !== null) {
			title = `Jukebot ${config.version}`;
		} else {
			title = "Jukebot";
		}

		const output = [
			bold(title),
			`> Ping: ${format(ping)} (${pingHint(Math.abs(ping))})`,
			`> API Latency: ${format(client.ws.ping)}`,
			`> Started: ${started}`,
			`> Memory: ${memoryUsage} MB`,
		];

		if (config.commitHash !== null) {
			const commit = hyperlink(
				config.commitHash.slice(0, 7),
				`<https://github.com/NachoToast/Jukebot/commit/${config.commitHash}>`,
			);

			output.push(`> Commit: ${commit}`);
		}

		await interaction.reply({ content: output.join("\n") });
	},
};
