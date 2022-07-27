import { viewCountFormatter } from './viewCountFormatter';

describe(`viewCountParser`, () => {
    it(`preserves view counts below a thousand`, () => {
        expect(viewCountFormatter(0)).toBe(`0`);
        expect(viewCountFormatter(100)).toBe(`100`);
        expect(viewCountFormatter(999)).toBe(`999`);
        expect(viewCountFormatter(-999)).toBe(`-999`);
        expect(viewCountFormatter(123)).toBe(`123`);
        expect(viewCountFormatter(-1)).toBe(`-1`);
    });

    it(`parses thousands`, () => {
        expect(viewCountFormatter(1000)).toBe(`1k`);
        expect(viewCountFormatter(1500)).toBe(`1.5k`);
        expect(viewCountFormatter(1520)).toBe(`1.52k`);
        expect(viewCountFormatter(1599)).toBe(`1.59k`);

        expect(viewCountFormatter(15999)).toBe(`15.9k`);
        expect(viewCountFormatter(78000)).toBe(`78k`);
        expect(viewCountFormatter(78300)).toBe(`78.3k`);

        expect(viewCountFormatter(105000)).toBe(`105k`);
        expect(viewCountFormatter(100000)).toBe(`100k`);
        expect(viewCountFormatter(123456)).toBe(`123k`);
    });

    it(`parses millions`, () => {
        expect(viewCountFormatter(1000000)).toBe(`1m`);
        expect(viewCountFormatter(1500000)).toBe(`1.5m`);
        expect(viewCountFormatter(1590000)).toBe(`1.59m`);
        expect(viewCountFormatter(1234567)).toBe(`1.23m`);

        expect(viewCountFormatter(10000000)).toBe(`10m`);
        expect(viewCountFormatter(12345678)).toBe(`12.3m`);
        expect(viewCountFormatter(123456789)).toBe(`123m`);
    });
});
