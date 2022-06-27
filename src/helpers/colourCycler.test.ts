import Colours from '../types/Colours';
import { colourCycler, defaultColourArray } from './colourCycler';

describe('colourCycler', () => {
    it('cycles through the default colours', () => {
        const expected: Colours[] = new Array<Colours>(defaultColourArray.length);

        const colours = colourCycler();
        for (let i = 0; i < defaultColourArray.length; i++) {
            expected[i] = colours.next().value;
        }

        for (let i = 0; i < defaultColourArray.length; i++) {
            expect(expected[i]).toBe(defaultColourArray[i]);
        }
    });

    it('cycles through custom colours', () => {
        const customColourArray: Colours[] = [Colours.FgBlack, Colours.FgBlue, Colours.BgBlack];

        const expected: Colours[] = new Array<Colours>(customColourArray.length);

        const colours = colourCycler(customColourArray);
        for (let i = 0; i < customColourArray.length; i++) {
            expected[i] = colours.next().value;
        }

        for (let i = 0; i < customColourArray.length; i++) {
            expect(expected[i]).toBe(customColourArray[i]);
        }
    });
});
