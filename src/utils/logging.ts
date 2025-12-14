import { Color } from "@/types/Color";
import { colorize } from "./colorize";

/** Standardised console log. */
export function log(message: string, ...rest: unknown[]): void {
	const timestamp = new Date().toLocaleString("en-NZ");

	console.log(`[${timestamp}] ${message}`, ...rest);
}

export function logWithTimeTaken(message: string, startTime: number): void {
	const timeTaken = colorize(`${(Date.now() - startTime).toLocaleString()}ms`, Color.FgMagenta);

	log(`${message} (${timeTaken})`);
}
