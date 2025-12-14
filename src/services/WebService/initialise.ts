import { createServer } from "node:http";
import express from "express";
import { config } from "@/config";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { logWithTimeTaken } from "@/utils/logging";
import { rateLimiter } from "./internal/middleware/rateLimiter";
import { setApp } from "./internal/state";

export function initialiseWebService(): Promise<void> {
	const { port, numProxies } = config.api;

	const startTime = Date.now();

	const app = express();

	setApp(app);

	app.set("trust proxy", numProxies);

	app.use(rateLimiter);

	app.get("/", (_, res) => {
		res.status(200).json({
			startTime: config.startTime,
			version: config.version,
			commitHash: config.commitHash,
		});
	});

	app.get("/ip", (req, res) => res.status(200).send(req.ip));

	const server = createServer(app);

	return new Promise((resolve) => {
		server.listen(port, () => {
			const url = colorize(`http://localhost:${port}`, Color.FgCyan);

			logWithTimeTaken(`Web API listening on ${url}`, startTime);

			resolve();
		});
	});
}
