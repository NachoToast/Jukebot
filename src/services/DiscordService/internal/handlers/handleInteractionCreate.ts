import { type Interaction, InteractionType } from "discord.js";
import { DisplayableError } from "@/errors/DisplayableError";
import { handleCommand } from "./handleCommand";

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
	if (interaction.isChatInputCommand()) {
		await handleCommand(interaction);
	} else {
		throw new DisplayableError(
			`Unknown interaction type: ${InteractionType[interaction.type]}`,
		);
	}
}
