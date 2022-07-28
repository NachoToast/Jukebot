import { MusicDisc } from '../classes/MusicDisc';
import { getQueueLength } from './getQueueLength';

describe(`getQueueLength`, () => {
    it(`Handles non-live queues`, () => {
        const noLive = [
            { live: false, durationSeconds: 12 },
            { live: false, durationSeconds: 34 },
            { live: false, durationSeconds: 56 },
        ] as MusicDisc[];

        expect(getQueueLength(noLive)).toEqual({ totalDuration: 12 + 34 + 56, hasLiveVideos: false });
    });

    it(`Handles only live queues`, () => {
        const allLive = [
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
        ] as MusicDisc[];

        expect(getQueueLength(allLive)).toEqual({ totalDuration: 0, hasLiveVideos: true });
    });

    it(`Handles hybrid queues`, () => {
        const someLive = [
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: false, durationSeconds: 12 },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: false, durationSeconds: 34 },
        ] as MusicDisc[];

        expect(getQueueLength(someLive)).toEqual({ totalDuration: 12 + 34, hasLiveVideos: true });
    });

    it(`Handles empty queues`, () => {
        expect(getQueueLength([])).toEqual({ totalDuration: 0, hasLiveVideos: false });
    });
});
