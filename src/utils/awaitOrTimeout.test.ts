import { describe, expect, test } from 'bun:test';
import { awaitOrTimeout, TimeoutError } from './awaitOrTimeout';

describe(awaitOrTimeout.name, () => {
    const text = 'among us';

    function wait(ms: number): Promise<string> {
        return new Promise((resolve) =>
            setTimeout(() => {
                resolve(text);
            }, ms),
        );
    }

    test('returns already-resolved promises', async () => {
        const promise = Promise.resolve(text);

        expect(await awaitOrTimeout(promise, 0)).toBe(text);
    });

    test('returns in-time promises', async () => {
        const promise = wait(4);

        // Wait for 5ms, should resolve in time.
        expect(await awaitOrTimeout(promise, 0.006)).toBe(text);
    });

    test('throws on timeout', async () => {
        const promise = wait(10);

        // Wait for 5ms, should timeout.
        try {
            await awaitOrTimeout(promise, 0.005);

            throw new Error('Did not timeout');
        } catch (error) {
            expect(error).toBeInstanceOf(TimeoutError);
        }
    });
});
