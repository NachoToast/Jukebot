import { numericalToString, stringToNumerical } from './timeConverters';

describe(`timeConverters`, () => {
    describe(`stringToNumerical`, () => {
        it(`should convert seconds`, () => {
            expect(stringToNumerical(`0:00`)).toBe(0);
            expect(stringToNumerical(`0:59`)).toBe(59);
            expect(stringToNumerical(`0:15`)).toBe(15);
        });

        it(`should convert minutes`, () => {
            expect(stringToNumerical(`1:00`)).toBe(60);
            expect(stringToNumerical(`1:30`)).toBe(90);
            expect(stringToNumerical(`1:59`)).toBe(119);
        });

        it(`should convert hours`, () => {
            expect(stringToNumerical(`1:00:00`)).toBe(60 * 60);
            expect(stringToNumerical(`1:30:00`)).toBe(60 * 60 + 60 * 30);
            expect(stringToNumerical(`24:00:00`)).toBe(60 * 60 * 24);
        });

        it(`should convert complex times`, () => {
            expect(stringToNumerical(`1:00:59`)).toBe(60 * 60 + 59);
            expect(stringToNumerical(`12:34:56`)).toBe(60 * 60 * 12 + 60 * 34 + 56);
            expect(stringToNumerical(`1:01:01`)).toBe(60 * 60 * 1 + 60 * 1 + 1);
        });
    });

    describe(`numericalToString`, () => {
        it(`should convert seconds`, () => {
            expect(numericalToString(0)).toBe(`0:00`);
            expect(numericalToString(59)).toBe(`0:59`);
            expect(numericalToString(15)).toBe(`0:15`);
        });

        it(`should convert minutes`, () => {
            expect(numericalToString(60)).toBe(`1:00`);
            expect(numericalToString(90)).toBe(`1:30`);
            expect(numericalToString(119)).toBe(`1:59`);
        });

        it(`should convert hours`, () => {
            expect(numericalToString(60 * 60)).toBe(`1:00:00`);
            expect(numericalToString(60 * 60 + 60 * 30)).toBe(`1:30:00`);
            expect(numericalToString(60 * 60 * 24)).toBe(`24:00:00`);
        });

        it(`should convert complex times`, () => {
            expect(numericalToString(60 * 60 + 59)).toBe(`1:00:59`);
            expect(numericalToString(60 * 60 * 12 + 60 * 34 + 56)).toBe(`12:34:56`);
            expect(numericalToString(60 * 60 * 1 + 60 * 1 + 1)).toBe(`1:01:01`);
        });
    });

    describe(`crosstesting`, () => {
        it(`should preserve seconds`, () => {
            expect(numericalToString(stringToNumerical(numericalToString(0)))).toBe(`0:00`);
            expect(numericalToString(stringToNumerical(numericalToString(59)))).toBe(`0:59`);
            expect(numericalToString(stringToNumerical(numericalToString(15)))).toBe(`0:15`);
        });

        it(`should preserve minutes`, () => {
            expect(numericalToString(stringToNumerical(numericalToString(60)))).toBe(`1:00`);
            expect(numericalToString(stringToNumerical(numericalToString(90)))).toBe(`1:30`);
            expect(numericalToString(stringToNumerical(numericalToString(119)))).toBe(`1:59`);
        });

        it(`should preserve hours`, () => {
            expect(numericalToString(stringToNumerical(numericalToString(60 * 60)))).toBe(`1:00:00`);
            expect(numericalToString(stringToNumerical(numericalToString(60 * 60 + 60 * 30)))).toBe(`1:30:00`);
            expect(numericalToString(stringToNumerical(numericalToString(60 * 60 * 24)))).toBe(`24:00:00`);
        });

        it(`should preserve complex times`, () => {
            expect(numericalToString(stringToNumerical(numericalToString(60 * 60 + 59)))).toBe(`1:00:59`);
            expect(numericalToString(stringToNumerical(numericalToString(60 * 60 * 12 + 60 * 34 + 56)))).toBe(
                `12:34:56`,
            );
            expect(numericalToString(stringToNumerical(numericalToString(60 * 60 * 1 + 60 * 1 + 1)))).toBe(`1:01:01`);

            expect(stringToNumerical(numericalToString(stringToNumerical(`3:33`)))).toBe(3 * 60 + 33);
        });
    });
});
