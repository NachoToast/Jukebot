import { Collection } from "discord.js";
import type { Command } from "./Command";
import { utilCommands } from "./util";

const commands: Collection<string, Command> = new Collection();

for (const command of utilCommands) {
	commands.set(command.name, command);
}

export { commands };
