import { configCommand } from './config';
import { debugCommand } from './debug';
import { patchNotesCommand } from './patchNotes';
import { sourceCommand } from './source';
import { statusCommand } from './status';

export const utilCommands = [statusCommand, sourceCommand, debugCommand, configCommand, patchNotesCommand];
