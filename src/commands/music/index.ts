import { JukebotGlobals } from '../../global';
import { leaveCommand } from './leave';
import { nowPlayingCommand } from './nowPlaying';
import { pauseCommand } from './pause';
import { playCommand } from './play';
import { queueCommand } from './queue';
import { resumeCommand } from './resume';
import { searchCommand } from './search';
import { skipCommand } from './skip';

export const musicCommands = [
    leaveCommand,
    playCommand,
    skipCommand,
    resumeCommand,
    pauseCommand,
    nowPlayingCommand,
    queueCommand,
];

if (JukebotGlobals.devmode) musicCommands.push(searchCommand);
