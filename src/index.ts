import { DatabaseService, DiscordService } from '@services';
import { Color } from '@types';
import { colorize, log } from '@utils';

await Promise.all([DiscordService.initialise(), DatabaseService.initialise()]);

log(colorize(`Jukebot is now running!`, Color.FgGreen));
