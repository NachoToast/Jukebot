import { Jukebox } from '../classes/Jukebox';
import { StatusTiers } from '../classes/Jukebox/types';
import { getTimeTillPlaybackDone } from './getTimeTillPlaybackDone';

describe(`getTimeTillPlaybackDone`, () => {
    it(`Returns 0 for non-active Jukeboxes`, () => {
        const idle = { status: { tier: StatusTiers.Idle } } as Jukebox;
        const inactive = { status: { tier: StatusTiers.Inactive } } as Jukebox;

        expect(getTimeTillPlaybackDone(idle)).toBe(0);
        expect(getTimeTillPlaybackDone(inactive)).toBe(0);
    });

    it(`Returns accurate information for valid play states`, () => {
        const testA = {
            status: {
                tier: StatusTiers.Active,
                playingSince: Date.now() - 37 * 1000,
                playing: { durationSeconds: 100 },
            },
        } as Jukebox;

        expect(getTimeTillPlaybackDone(testA)).toBe(63);

        const testB = {
            status: {
                tier: StatusTiers.Active,
                playingSince: Date.now() - 63 * 1000,
                playing: { durationSeconds: 98 },
            },
        } as Jukebox;

        expect(getTimeTillPlaybackDone(testB)).toBe(35);

        const testC = {
            status: {
                tier: StatusTiers.Active,
                playingSince: Date.now() - 37 * 1000,
                playing: { durationSeconds: 37 },
            },
        } as Jukebox;

        expect(getTimeTillPlaybackDone(testC)).toBe(0);
    });

    it(`Returns 0 for invalid play states`, () => {
        const testA = {
            status: {
                tier: StatusTiers.Active,
                playingSince: Date.now() - 37 * 1000,
                playing: { durationSeconds: 30 },
            },
        } as Jukebox;

        expect(getTimeTillPlaybackDone(testA)).toBe(0);
    });
});
