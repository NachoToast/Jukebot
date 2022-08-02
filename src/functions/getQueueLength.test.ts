import { MusicDisc } from '../classes/MusicDisc';
import { getQueueLength } from './getQueueLength';

describe(`getQueueLength`, () => {
    it(`Handles non-live queues`, () => {
        const noLive = [
            { live: false, durationSeconds: 12 },
            { live: false, durationSeconds: 34 },
            { live: false, durationSeconds: 56 },
        ] as MusicDisc[];

        const res = getQueueLength(noLive);
        expect(res.totalDuration).toEqual(12 + 34 + 56);
        expect(res.numLiveVideos).toEqual(0);
        expect(res.durationTillFirstLive).toEqual(12 + 34 + 56);
    });

    it(`Handles only live queues`, () => {
        const allLive = [
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
        ] as MusicDisc[];

        const res = getQueueLength(allLive);

        expect(res.totalDuration).toEqual(0);
        expect(res.numLiveVideos).toEqual(3);
        expect(res.durationTillFirstLive).toEqual(0);
    });

    it(`Handles hybrid queues`, () => {
        const someLive1 = [
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: false, durationSeconds: 12 },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: false, durationSeconds: 34 },
        ] as MusicDisc[];

        const res1 = getQueueLength(someLive1);

        expect(res1.totalDuration).toEqual(12 + 34);
        expect(res1.numLiveVideos).toEqual(2);
        expect(res1.durationTillFirstLive).toEqual(0);

        const someLive2 = [
            { live: false, durationSeconds: 12 },
            { live: false, durationSeconds: 34 },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: false, durationSeconds: 56 },
            { live: true, durationSeconds: Number.POSITIVE_INFINITY },
            { live: false, durationSeconds: 78 },
        ] as MusicDisc[];

        const res2 = getQueueLength(someLive2);

        expect(res2.totalDuration).toEqual(12 + 34 + 56 + 78);
        expect(res2.numLiveVideos).toEqual(2);
        expect(res2.durationTillFirstLive).toEqual(12 + 34);
    });

    it(`Handles empty queues`, () => {
        expect(getQueueLength([])).toEqual({ totalDuration: 0, numLiveVideos: 0, durationTillFirstLive: 0 });
    });
});
