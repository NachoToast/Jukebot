import { levenshteinDistance } from './levenshtein';

describe('levenshteinDistance', () => {
    it('returns 1 for identical strings', () => {
        expect(levenshteinDistance('', '')).toBe(1);
        expect(levenshteinDistance('reallylongstring', 'reallylongstring')).toBe(1);
    });

    it('returns 0 for completely different strings', () => {
        expect(levenshteinDistance('', 'a')).toBe(0);
        expect(levenshteinDistance('nacho', 'toast')).toBe(0);
        expect(levenshteinDistance('pog', 'champ')).toBe(0);
    });

    it('returns some expected values', () => {
        expect(levenshteinDistance('faded', 'fded')).toBe(0.8);
        expect(levenshteinDistance('louder', 'faster')).toBe(1 / 3);
        expect(levenshteinDistance('monday', 'sunday')).toBe(2 / 3);
        expect(levenshteinDistance('sitting', 'kitten')).toBe(0.5714285714285714);
    });
});
