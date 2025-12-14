import { SQL } from "bun";
import { config } from "@/config";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";
import { tryWithBackoff } from "@/utils/tryWithBackoff";
import { createCommandDeploymentsTable } from "./commandDeployments";
import { setPg } from "./state";

export async function initialiseDatabaseService(): Promise<void> {
	const { hostname, port, database, username, password } = config.db;

	let startTime = Date.now();

	let connected = false;

	// Logging In

	const pg = new SQL({
		hostname,
		port,
		database,
		username,
		password,

		onconnect: (): void => {
			// biome-ignore lint/nursery/noUnnecessaryConditions: LOUD INCORRECT BUZZER
			if (connected) return;

			connected = true;

			logWithTimeTaken("Connected to PostgreSQL", startTime);
		},

		onclose: (): void => {
			if (!connected) return;

			log(colorize("Disconnected from PostgreSQL", Color.FgRed));

			connected = false;

			tryWithBackoff(
				pg.connect,
				(x) => {
					log(`Attempting to reconnect to PostgreSQL (try #${x.toLocaleString()})`);
					startTime = Date.now();
				},
				() => connected,
			).catch(console.error);
		},
	});

	setPg(pg);

	await pg.connect();

	// Table Creation

	await createCommandDeploymentsTable();
}
