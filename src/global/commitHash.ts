import { execSync } from "child_process";

export const commitHash = execSync('git rev-parse HEAD').toString().trim()
