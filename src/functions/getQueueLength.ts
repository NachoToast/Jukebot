import { MusicDisc } from '../classes/MusicDisc';
export interface QueueLengthInfo {
    /** Cumulative duration (in seconds) of all non-live videos in the queue. */
    totalDuration: number;

    /** Cumulative duration (in seconds) of all videos before the first live one. */
    durationTillFirstLive: number;

    /** Number of live videos in the queue. */
    numLiveVideos: number;
}

export function getQueueLength(queue: MusicDisc[]): QueueLengthInfo {
    let totalDuration = 0;
    let durationTillFirstLive = 0;
    let numLiveVideos = 0;

    for (const disc of queue) {
        if (disc.live) numLiveVideos++;
        else {
            totalDuration += disc.durationSeconds;
            if (numLiveVideos === 0) durationTillFirstLive += disc.durationSeconds;
        }
    }

    return { totalDuration, numLiveVideos, durationTillFirstLive };
}
