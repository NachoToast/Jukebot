/**
 * Keeps attempting to execute the {@link fn} with quadratic backoff.
 *
 * @param fn The function to run.
 * @param logAttempt Called when an attempt is made.
 * @param stopCondition Checked before an attempt is made.
 */
export async function tryWithBackoff(
	fn: () => Promise<unknown>,
	logAttempt: (x: number) => void,
	stopCondition: () => boolean,
): Promise<void> {
	for (let i = 0; i < Number.POSITIVE_INFINITY; i++) {
		if (stopCondition()) break;

		logAttempt(i + 1);

		try {
			// biome-ignore lint/performance/noAwaitInLoops: That's like the whole point of this function...
			await fn();
		} catch {
			// Swallow error.
		}

		if (stopCondition()) return;

		const timeToWait = (i + 1) ** 2;

		await new Promise((resolve) => {
			setTimeout(resolve, 1000 * timeToWait);
		});
	}
}
