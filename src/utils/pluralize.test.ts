import { describe, expect, test } from "bun:test";
import { irregularPluralize, pluralize } from "./pluralize";

describe(pluralize.name, () => {
	test("pluralizes none", () => {
		expect(pluralize(0, "apple")).toBe("0 apples");
	});

	test("pluralizes one", () => {
		expect(pluralize(1, "apple")).toBe("1 apple");
	});

	test("pluralizes many", () => {
		expect(pluralize(5, "apple")).toBe("5 apples");
	});
});

describe(irregularPluralize.name, () => {
	test("pluralizes none", () => {
		expect(irregularPluralize(0, "person", "people")).toBe("0 people");
	});

	test("pluralizes one", () => {
		expect(irregularPluralize(1, "person", "people")).toBe("1 person");
	});

	test("pluralizes many", () => {
		expect(irregularPluralize(5, "person", "people")).toBe("5 people");
	});
});
