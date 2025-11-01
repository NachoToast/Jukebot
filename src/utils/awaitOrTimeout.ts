/** Special error class thrown by {@link awaitOrTimeout}. */
export class TimeoutError extends Error {}

/**
 * Unique symbol to identify timeouts.
 *
 * We can't just use `null` or `undefined` because those could be resolved by
 * the original promise.
 */
const timeoutSymbol = Symbol();

/**
 * Waits for a promise to resolve in the given number of seconds, or throws a
 * {@link TimeoutError}.
 *
 * Note that this cannot abort the original promise, callers are expected to
 * handle this in a `catch` block if necessary.
 */
export async function awaitOrTimeout<T>(
    promise: Promise<T>,
    timeoutSeconds: number,
): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<typeof timeoutSymbol>((resolve) => {
        timeout = setTimeout(() => {
            resolve(timeoutSymbol);
        }, timeoutSeconds * 1_000);
    });

    const race = await Promise.race([promise, timeoutPromise]);

    clearTimeout(timeout);

    // The timeout promise resolved first.
    if (race === timeoutSymbol) {
        throw new TimeoutError();
    }

    return race;
}
