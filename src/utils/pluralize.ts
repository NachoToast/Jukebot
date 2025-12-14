/**
 * Creates a string of the number and pluralized word if necessary.
 *
 * For irregular plural nouns, see {@link irregularPluralize}.
 *
 * @example
 * ```ts
 * pluralize(1, 'apple'); // "1 apple"
 * pluralize(2, 'apple'); // "2 apples"
 * ```
 */
export function pluralize(count: number, singular: string): string {
	return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}

/**
 * Creates a string of the number and pluralized word if necessary.
 *
 * This is for irregular plural nouns, for regular plural nouns see {@link pluralize}.
 *
 * @example
 * ```ts
 * irregularPluralize(1, 'person', 'people'); // "1 person"
 * irregularPluralize(5, 'person', 'people'); // "5 people"
 * ```
 */
export function irregularPluralize(count: number, singular: string, plural: string): string {
	return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
