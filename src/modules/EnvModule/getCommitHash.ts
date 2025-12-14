import { execSync } from "node:child_process";

/**
 * Attempts to get the current git commit hash.
 *
 * @example "ff091038e55455066208152c00e1c2284effbcf2"
 */
export function getCommitHash(): string | null {
	try {
		return execSync("git rev-parse HEAD").toString().trim() || null;
	} catch {
		return null;
	}
}
