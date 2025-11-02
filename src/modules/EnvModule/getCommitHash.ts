import { execSync } from 'child_process';

export function getCommitHash(): string | null {
    try {
        return execSync('git rev-parse HEAD').toString().trim() || null;
    } catch {
        return null;
    }
}
