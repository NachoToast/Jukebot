import { Collection } from 'discord.js';
import type { Command } from './Command';
import { utilCommands } from './util';

export const commands = new Collection<string, Command>();

utilCommands.forEach((command) => commands.set(command.name, command));
