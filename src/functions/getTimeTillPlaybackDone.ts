import { Jukebox } from '../classes/Jukebox';
import { StatusTiers } from '../classes/Jukebox/types';

/**
 * Returns the number of remaining seconds until the currently playing resource
 * finished playback.
 *
 * If no resource is currently playing, will return 0.
 *
 * If the resource has been playing longer than it should have, will also return 0.
 */
export function getTimeTillPlaybackDone(jukebox: Jukebox): number {
    if (jukebox.status.tier !== StatusTiers.Active) return 0;

    const startedAt = jukebox.status.playingSince;

    /** How long the resource has been playing for, in seconds. */
    const playingFor = Math.floor((Date.now() - startedAt) / 1000);

    const timeLeft = jukebox.status.playing.durationSeconds - playingFor;

    if (timeLeft < 0) return 0;

    return timeLeft;
}
