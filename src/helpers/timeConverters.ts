/** Converts a string representation of duration into a numerical duration.
 * @param {string} s The string, e.g. `0:12`, `3:45`, or `5:06:07`.
 * @returns {number} The duration in seconds.
 */
export function stringToNumerical(s: string): number {
    const timeAmounts = s.split(':').reverse();
    let duration = 0;

    if (timeAmounts[0]) {
        // seconds
        duration += Number(timeAmounts[0]);
    }
    if (timeAmounts[1]) {
        // minutes
        duration += 60 * Number(timeAmounts[1]);
    }
    if (timeAmounts[2]) {
        // hours
        duration += 60 * 60 * Number(timeAmounts[2]);
    }
    return duration;
}

/** Converts a numerical duration into it's string representation.
 * @param {number} n The duration in seconds.
 * @returns {string} A formatted string, e.g. `0:12`, `3:45`, or `5:06:07`.
 */
export function numericalToString(n: number): string {
    let minutes = Math.floor(n / 60);
    n -= minutes * 60;
    const hours = Math.floor(minutes / 60);
    minutes -= hours * 60;

    // seconds
    let outputStr = n.toString().padStart(2, '0');

    // minutes
    outputStr = minutes.toString().padStart(hours ? 2 : 1, '0') + ':' + outputStr;

    if (hours) {
        outputStr = hours.toString() + ':' + outputStr;
    }

    return outputStr;
}
