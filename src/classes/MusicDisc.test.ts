import { GuildedInteraction } from '../types/Interactions';
import { MusicDisc } from './MusicDisc';
import { YouTubeVideo } from 'play-dl';
import { defaultDiscArray } from '../helpers/chooseRandomDisc';

describe('MusicDisc', () => {
    const fakeInteraction = { member: null } as unknown as GuildedInteraction;

    const fakeData = {
        duration: '1:23:45',
        url: 'https://example.com',
        thumbnails: [],
    } as unknown as YouTubeVideo;

    it('should make a DiscImage if no thumbnail provided', () => {
        const { thumbnail } = new MusicDisc(fakeInteraction, fakeData);
        expect(defaultDiscArray).toContain(thumbnail);
    });
});
