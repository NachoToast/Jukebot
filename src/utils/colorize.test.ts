import { describe, expect, test } from 'bun:test';
import { Color } from '../types';
import { colorize } from './colorize';

describe(colorize.name, () => {
    test('wraps the string', () => {
        const text = 'i love minceraft';

        const coloredText = colorize(text, Color.FgGreen);

        expect(coloredText).toBe(`${Color.FgGreen}${text}${Color.Reset}`);
    });
});
