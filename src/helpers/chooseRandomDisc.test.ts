import { YouTubeVideo } from 'play-dl';
import { MusicDisc } from '../classes/MusicDisc';
import { GuildedInteraction } from '../types/Interactions';

describe('chooseRandomDisc', () => {
    const fakeInteraction = { member: null } as unknown as GuildedInteraction;

    const fakeData = {
        duration: '1:23:45',
        url: 'https://example.com',
        thumbnails: [],
    } as unknown as YouTubeVideo;

    it('should give a random DiscImage if no thumbnail provided', () => {
        jest.spyOn(global.Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.5).mockReturnValueOnce(0.9);

        const [discA, discB, discC] = new Array(3)
            .fill(undefined)
            .map(() => new MusicDisc(fakeInteraction, fakeData).thumbnail);

        expect(discA).not.toBe(discB);
        expect(discB).not.toBe(discC);
        expect(discC).not.toBe(discA);
    });
});
