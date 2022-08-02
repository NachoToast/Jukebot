import { chooseRandomDisc } from './chooseRandomDisc';

describe(`chooseRandomDisc`, () => {
    it(`Chooses a random DiscImage`, () => {
        jest.spyOn(global.Math, `random`).mockReturnValueOnce(0.1).mockReturnValueOnce(0.5).mockReturnValueOnce(0.9);

        const [discA, discB, discC] = new Array(3).fill(null).map(() => chooseRandomDisc());

        expect(discA).not.toBe(discB);
        expect(discB).not.toBe(discC);
        expect(discC).not.toBe(discA);
    });
});
