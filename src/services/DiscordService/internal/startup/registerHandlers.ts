import { Events } from "discord.js";
import { handleError } from "../../handleError";
import { handleInteractionCreate } from "../handlers/handleInteractionCreate";
import { client } from "../state";

export function registerHandlers(): void {
	client.on(Events.InteractionCreate, (interaction) => {
		handleInteractionCreate(interaction).catch((error) => {
			handleError(error, interaction);
		});
	});

	client.on(Events.Error, (error) => {
		handleError(error);
	});
}
