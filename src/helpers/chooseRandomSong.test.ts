import { chooseRandomArtist, randomArtists } from './chooseRandomSong';

describe('chooseRandomSong', () => {
    it('should choose a random song', () => {
        jest.spyOn(global.Math, 'random').mockReturnValue(0);
        expect(chooseRandomArtist()).toBe(randomArtists[0]);

        jest.spyOn(global.Math, 'random').mockReturnValue(5);
        expect(chooseRandomArtist()).toBe(randomArtists[5]);
    });

    it.only('should never return the same song back-to-back', () => {
        jest.spyOn(global.Math, 'random').mockReturnValue(0);
        const firstOption = chooseRandomArtist();
        const secondOption = chooseRandomArtist();
        expect(firstOption).not.toEqual(secondOption);
    });
});
