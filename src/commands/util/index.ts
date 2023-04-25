import { configCommand } from './config';
import { debugCommand } from './debug';
import { sourceCommand } from './source';
import { statusCommand } from './status';

export const utilCommands = [statusCommand, sourceCommand, debugCommand, configCommand];
