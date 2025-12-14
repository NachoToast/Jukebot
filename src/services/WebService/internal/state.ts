import type { Express } from "express";

export let app: Express;

export function setApp(newApp: Express): void {
	app = newApp;
}
