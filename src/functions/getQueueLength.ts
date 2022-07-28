import { MusicDisc } from '../classes/MusicDisc';

/**
 * Gets the cumulative duration (in seconds) of a queue, excluding live videos.
 *
 * Will return `undefined` if the queue has live videos
 */
export function getQueueLength(queue: MusicDisc[]): { totalDuration: number; hasLiveVideos: boolean } {
    let totalDuration = 0;
    let hasLiveVideos = false;

    for (const disc of queue) {
        if (disc.live) hasLiveVideos = true;
        else {
            totalDuration += disc.durationSeconds;
        }
    }

    return { totalDuration, hasLiveVideos };
}
