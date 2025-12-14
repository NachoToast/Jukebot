import { execSync } from "node:child_process";

/**
 * Attempts to get the current git tag name.
 *
 * @example "4.0-alpha"
 */
export function getVersion(): string | null {
	try {
		return execSync("git describe --tags --abbrev=0").toString().trim() || null;
	} catch {
		return null;
	}
}
