import { AnyValidSearch, MapSearchSourceToTypes, ValidSearchSources } from '../../../types/Searches';
import { HopperResult } from '../../Hopper/types';
import { Jukebox } from '../Jukebox';
import { ActiveJukeboxStatus } from '../types';
import { makeAddedToQueueEmbed } from './AddedToQueue';
import { makeNowPlayingEmbed } from './NowPlaying';

/**
 * Makes a hybrid "added to queue" and "now playing" embed.
 *
 * This is shown when a playlist is added and immediately starts playing,
 * since a "now playing" embed on it's own won't reflect all the added playlist songs,
 * and a "added to queue" embed won't reflect the change in play state.
 */
export function makeHybridEmbed(
    status: ActiveJukeboxStatus,
    jukebox: Jukebox,
    result: HopperResult<ValidSearchSources, MapSearchSourceToTypes<ValidSearchSources>>,
    search: AnyValidSearch,
): string {
    return makeNowPlayingEmbed(status) + `\n` + makeAddedToQueueEmbed(jukebox, result, search);
}
