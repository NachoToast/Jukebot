import type { Command } from "../Command";
import { sourceCommand } from "./source";
import { statusCommand } from "./status";

export const utilCommands: Command[] = [sourceCommand, statusCommand];
