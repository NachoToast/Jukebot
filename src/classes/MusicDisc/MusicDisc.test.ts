import { GuildMember } from 'discord.js';
import { YouTubeVideo } from 'play-dl';
import { defaultDiscArray } from '../../functions/chooseRandomDisc';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import { MusicDisc } from './MusicDisc';

describe(`MusicDisc`, () => {
    const fakeMember: GuildMember = Object.create(GuildMember.prototype);

    const fakeData = {
        duration: `1:23:45`,
        url: `https://example.com`,
        thumbnails: [],
    } as unknown as YouTubeVideo;

    it(`Chooses a random DiscImage if no thumbnail is provided`, () => {
        const fakeInteraction = { member: fakeMember } as unknown as JukebotInteraction;
        jest.spyOn(global.Math, `random`).mockReturnValue(0);

        const { thumbnail } = new MusicDisc(fakeInteraction, fakeData);
        expect(defaultDiscArray[0]).toBe(thumbnail);
    });

    it(`Throws an error if a non-GuildMember tries to create a MusicDisc`, () => {
        const fakeInteraction = { member: {} } as unknown as JukebotInteraction;

        try {
            new MusicDisc(fakeInteraction, fakeData);
            fail(`Should have errored`);
        } catch (error) {
            //
        }
    });
});
