import { chooseRandomArtist, randomArtists } from './chooseRandomArtist';

describe('chooseRandomSong', () => {
    it('Chooses a random song', () => {
        jest.spyOn(global.Math, 'random').mockReturnValue(0);
        expect(chooseRandomArtist()).toBe(randomArtists[0]);

        jest.spyOn(global.Math, 'random').mockReturnValue(0.999);
        expect(chooseRandomArtist()).toBe(randomArtists[randomArtists.length - 1]);
    });

    it('Never returns the same song back-to-back', () => {
        jest.spyOn(global.Math, 'random').mockReturnValue(0);

        const first = chooseRandomArtist();
        const second = chooseRandomArtist();
        const third = chooseRandomArtist();

        expect(first).not.toEqual(second);
        expect(first).toBe(third);
    });
});
