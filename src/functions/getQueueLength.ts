import { MusicDisc } from '../classes/MusicDisc';

/** Gets the cumulative duration (in seconds) of a queue, excluding live videos. */
export function getQueueLength(queue: MusicDisc[]): { totalDuration: number; numLiveVideos: number } {
    let totalDuration = 0;
    let numLiveVideos = 0;

    for (const disc of queue) {
        if (disc.live) numLiveVideos++;
        else {
            totalDuration += disc.durationSeconds;
        }
    }

    return { totalDuration, numLiveVideos };
}
