import type { Channel, SendableChannels } from "discord.js";
import { config } from "@/config";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { client } from "../state";

export async function fetchErrorChannel(): Promise<SendableChannels | null> {
	if (config.errorChannelId === null) {
		return null;
	}

	let channel: Channel | null;

	try {
		channel = await client.channels.fetch(config.errorChannelId);
	} catch {
		channel = null;
	}

	if (channel === null) {
		const channelId = colorize(config.errorChannelId, Color.FgMagenta);

		throw new Error(`Could not find error channel with ID ${channelId}`);
	}

	if (!channel.isSendable()) {
		const channelId = colorize(config.errorChannelId, Color.FgMagenta);

		throw new Error(`Error channel ${channelId} must be a sendable channel`);
	}

	return channel;
}
