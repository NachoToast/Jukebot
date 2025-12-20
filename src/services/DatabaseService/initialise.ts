import process from "node:process";
import { SQL } from "bun";
import { config } from "@/config";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";
import { createCommandDeploymentsTable } from "./commandDeployments";
import { setPg } from "./state";

enum ConnectionStatus {
	Attempting,
	Connected,
	Disconnected,
}

export async function initialiseDatabaseService(): Promise<void> {
	const { hostname, port, database, username, password } = config.db;

	const startTime = Date.now();

	// Logging In

	let connectionStatus = ConnectionStatus.Attempting;

	const pg = new SQL({
		hostname,
		port,
		database,
		username,
		password,

		onconnect: (): void => {
			if (connectionStatus === ConnectionStatus.Connected) return;

			connectionStatus = ConnectionStatus.Connected;

			logWithTimeTaken("Connected to PostgreSQL", startTime);
		},

		onclose: (): void => {
			switch (connectionStatus) {
				case ConnectionStatus.Attempting:
					log(colorize("Failed to connect to PostgreSQL", Color.FgRed));
					break;
				case ConnectionStatus.Connected:
					log(colorize("Disconnected from PostgreSQL", Color.FgRed));
					break;
				default:
					return;
			}

			connectionStatus = ConnectionStatus.Disconnected;

			process.exit(1);
		},
	});

	setPg(pg);

	await pg.connect();

	// Table Creation

	await createCommandDeploymentsTable();
}
