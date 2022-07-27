/** Formats a number of views into a string.
 * @example 1000 -> '1k',
 * @example 1000000 -> '1m'
 * @example 123456 -> '123k'
 * @example 123456789 -> '123m'
 *
 * @param {number} n The total number of views.
 * @return {string} The formatted string.
 */
export function viewCountFormatter(n: number): string {
    if (n >= 1e12) return `${precisionFormatter(n, 1e12)}t`;
    else if (n >= 1e9) return `${precisionFormatter(n, 1e9)}b`;
    else if (n >= 1e6) return `${precisionFormatter(n, 1e6)}m`;
    else if (n >= 1e3) return `${precisionFormatter(n, 1e3)}k`;
    else return n.toString();
}

/** Returns a number to an appropriate precision.
 *
 * Results greater than or equal to 100 are whole numbers.
 *
 * Results greater than or equal to 10 have 1 d.p. of precision.
 *
 * All other results have 2 d.p. of precision
 *
 * @param {number} n The dividend (numerator).
 * @param {number} divisor The divisor (denominator).
 * @param {boolean} [includeZero=false] Whether to include trailing zeros.
 * @returns {string} String with appropriate precision.
 */
function precisionFormatter(n: number, divisor: number, includeZero: boolean = false): string {
    const whole = Math.floor(n / divisor);
    const leftover = n % divisor;

    let desiredPrecision = 0;
    let decimalValue = 0;

    if (whole >= 100 || (!leftover && !includeZero)) return whole.toString();
    if (whole >= 10) desiredPrecision = 1;
    else desiredPrecision = 2;

    // slice away unwanted digits
    decimalValue = Math.floor(10 ** desiredPrecision * (leftover / divisor)) / 10 ** desiredPrecision;

    let res = (whole + decimalValue).toFixed(desiredPrecision);

    if (!includeZero) {
        while (res.endsWith(`0`)) res = res.slice(0, -1);
    }

    return res;
}
