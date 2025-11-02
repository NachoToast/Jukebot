import { execSync } from 'child_process';

export function getVersion(): string | null {
    try {
        return execSync('git describe --tags --abbrev=0').toString().trim() || null;
    } catch {
        return null;
    }
}
