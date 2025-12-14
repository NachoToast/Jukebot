/** biome-ignore-all lint/style/useNamingConvention: DB model */
import type { Snowflake } from "discord.js";
import { config } from "@/config";
import { pg } from "./state";

interface CommandDeploymentModel {
	discord_id: Snowflake;

	was_global: boolean;

	commands: string;
}

function getIsGlobal(): boolean {
	return config.environment === "production";
}

export async function createCommandDeploymentsTable(): Promise<void> {
	await pg`
        CREATE TABLE IF NOT EXISTS deployments(
            discord_id VARCHAR(32) PRIMARY KEY,
            was_global BOOLEAN NOT NULL,
            commands VARCHAR(65535) NOT NULL
        )
    `.execute();
}

/** Decides whether a local and global command deployment is needed. */
export async function evaluateDeployment(
	discordId: Snowflake,
	commandsString: string,
): Promise<{ local: boolean | null; global: boolean | null }> {
	const isGlobal = getIsGlobal();

	const results = await pg<
		CommandDeploymentModel[]
	>`SELECT * FROM deployments WHERE discord_id = ${discordId}`.execute();

	const lastDeployment = results.at(0);

	if (lastDeployment === undefined) {
		return isGlobal ? { local: null, global: true } : { local: true, global: null };
	}

	const dirtiedCommands = lastDeployment.commands !== commandsString ? true : null;

	if (lastDeployment.was_global) {
		// If the last deployment was global...
		if (isGlobal) {
			// ... and we still want global, only redeploy if changed.
			return { local: null, global: dirtiedCommands };
		}

		// ... and we no longer want global, undeploy globally and deploy locally.
		return { local: true, global: false };
	}

	// If the last deployment was local...
	if (isGlobal) {
		// ... and we now want global, undeploy locally and deploy globally.
		return { local: false, global: true };
	}

	// ... and we still want local, only redeploy if changed.
	return { local: dirtiedCommands, global: null };
}

export async function saveDeployment(discordId: Snowflake, commandsString: string): Promise<void> {
	const isGlobal = getIsGlobal();

	await pg`
        INSERT INTO deployments(discord_id, was_global, commands)
        VALUES(${discordId}, ${isGlobal}, ${commandsString})
        ON CONFLICT (discord_id)
        DO UPDATE SET was_global = ${isGlobal}, commands = ${commandsString}
    `.execute();
}
