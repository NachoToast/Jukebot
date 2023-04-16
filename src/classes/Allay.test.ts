import { Search } from '../types';
import { Allay } from './Allay';

describe(Allay.name, () => {
    describe(Allay['discernSearchSource'].name, () => {
        const discern = Allay['discernSearchSource'].bind(Allay);

        describe('YouTube URLs', () => {
            it('recognizes playlist URLs', () => {
                expect(discern('https://www.youtube.com/playlist?list=abcdefg')).toEqual<Search>({
                    source: 'youtube',
                    type: 'playlist',
                });

                expect(discern('https://www.youtube.com/watch?v=abcdefg&list=abcdefg&index=1')).toEqual<Search>({
                    source: 'youtube',
                    type: 'playlist',
                });
            });

            it('recognizes video URLs', () => {
                expect(discern('https://www.youtube.com/watch?v=abcdefg')).toEqual<Search>({
                    source: 'youtube',
                    type: 'video',
                });

                expect(discern('https://youtu.be/abcdefg')).toEqual<Search>({
                    source: 'youtube',
                    type: 'video',
                });
            });

            it('throws an error for invalid URLs', () => {
                expect(() => discern('https://www.youtube.com/')).toThrowError();
            });
        });

        describe('Spotify URLs', () => {
            it('recognizes playlist URLs', () => {
                expect(discern('https://open.spotify.com/playlist/abcdefg')).toEqual<Search>({
                    source: 'spotify',
                    type: 'playlist',
                });
            });

            it('recognizes album URLs', () => {
                expect(discern('https://open.spotify.com/album/abcdefg')).toEqual<Search>({
                    source: 'spotify',
                    type: 'album',
                });
            });

            it('recognizes track URLs', () => {
                expect(discern('https://open.spotify.com/track/abcdefg')).toEqual<Search>({
                    source: 'spotify',
                    type: 'track',
                });
            });

            it('throws an error for invalid URLs', () => {
                expect(() => discern('https://open.spotify.com/')).toThrowError();
            });
        });

        describe('text searches', () => {
            it('recognizes text searches', () => {
                expect(discern('abcdefg')).toEqual<Search>({
                    source: 'text',
                    type: null,
                });
            });

            it('throws an error for text searches that are too short', () => {
                expect(() => discern('')).toThrowError();
                expect(() => discern('a')).toThrowError();
                expect(() => discern('ab')).toThrowError();
            });
        });

        describe('invalid searches', () => {
            it('throws an error for unrecognized URLs', () => {
                expect(() => discern('https://www.google.com/')).toThrowError();
            });

            it('throws an error for invalid URLs', () => {
                expect(() => discern('http:')).toThrowError();
                expect(() => discern('some thing.com')).toThrowError();
            });
        });
    });

    describe(Allay['levenshteinDistance'].name, () => {
        const levenshtein = Allay['levenshteinDistance'].bind(Allay);

        it('returns 1 for identical strings', () => {
            expect(levenshtein('', '')).toBe(1);
            expect(levenshtein('reallylongstring', 'reallylongstring')).toBe(1);
        });

        it('returns 0 for completely different strings', () => {
            expect(levenshtein('', 'a')).toBe(0);
            expect(levenshtein('nacho', 'toast')).toBe(0);
            expect(levenshtein('pog', 'champ')).toBe(0);
        });

        it('eturns some expected values', () => {
            expect(levenshtein('faded', 'fded')).toBe(0.8);
            expect(levenshtein('louder', 'faster')).toBe(1 / 3);
            expect(levenshtein('monday', 'sunday')).toBe(2 / 3);
            expect(levenshtein('sitting', 'kitten')).toBe(0.5714285714285714);
        });
    });
});
