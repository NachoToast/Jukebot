/** Waits for a promise to resolve in the given number of seconds, or throws an error. */
export async function awaitOrTimeout<T>(promise: Promise<T>, timeoutSeconds: number, message: string): Promise<T> {
    if (timeoutSeconds === 0) return await promise;

    const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(resolve, timeoutSeconds * 1_000);
    });

    // the timeout promise resolved before the supplied one did
    const race = await Promise.race([promise, timeoutPromise]);

    if (race === undefined) throw new Error(message);
    return race;
}
