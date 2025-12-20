/** biome-ignore-all lint/style/useNamingConvention: DB model */
import { randomBytes } from "node:crypto";
import type { Snowflake } from "discord.js";
import { pg } from "./state";

// interface SessionModel {
// 	discord_id: Snowflake;

// 	token: string;
// }

export async function createSessionsTable(): Promise<void> {
	await pg`
        CREATE TABLE IF NOT EXISTS sessions(
            discord_id VARCHAR(32) PRIMARY KEY,
            token VARCHAR(8) NOT NULL
        )
    `.execute();
}

export async function createSession(discordId: Snowflake): Promise<string> {
	const token = randomBytes(4).toString("hex");

	await pg`
        INSERT INTO sessions(discord_id, token)
        VALUES(${discordId}, ${token})
        ON CONFLICT (discord_id)
        DO UPDATE SET token = ${token}
    `;

	return token;
}
