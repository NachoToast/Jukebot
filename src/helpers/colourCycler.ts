import { Colours } from '../types/Colours';

export const defaultColourArray: Colours[] = [
    Colours.FgRed,
    Colours.FgGreen,
    Colours.FgYellow,
    Colours.FgBlue,
    Colours.FgMagenta,
    Colours.FgCyan,
];

export function* colourCycler(colourArray: Colours[] = defaultColourArray): Generator<Colours, Colours> {
    let index = 0;

    while (true) {
        yield colourArray[index];
        index = (index + 1) % colourArray.length;
    }
}
