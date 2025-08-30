import { JukebotGlobals } from '../../global';
import { clearCommand } from './clear';
import { dreamCommand } from './dream';
import { leaveCommand } from './leave';
import { nowPlayingCommand } from './nowPlaying';
import { pauseCommand } from './pause';
import { playCommand } from './play';
import { previousCommand } from './previous';
import { queueCommand } from './queue';
import { removeCommand } from './remove';
import { resumeCommand } from './resume';
import { searchCommand } from './search';
import { shuffleCommand } from './shuffle';
import { skipCommand } from './skip';

export const musicCommands = [
    leaveCommand,
    playCommand,
    skipCommand,
    resumeCommand,
    pauseCommand,
    nowPlayingCommand,
    queueCommand,
    clearCommand,
    removeCommand,
    shuffleCommand,
    previousCommand,
    dreamCommand,
];

if (JukebotGlobals.devmode) musicCommands.push(searchCommand);
