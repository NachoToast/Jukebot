import type { SQL } from "bun";

export let pg: SQL;

export function setPg(newPg: SQL): void {
	pg = newPg;
}
