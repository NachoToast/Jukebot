import { Collection } from 'discord.js';
import { Command } from '../types';
import { musicCommands } from './music';
import { utilCommands } from './util';

export const commands = new Collection<string, Command>();

utilCommands.forEach((e) => {
    commands.set(e.name, e);
});

musicCommands.forEach((e) => {
    commands.set(e.name, e);
});
