/** Nicely parses an error stack. */
export function* parseErrorStack(stack: string): Generator<string> {
	yield "> ```js";

	for (let line of stack.split("\n").splice(1)) {
		if (line.includes("node_modules")) {
			continue;
		}

		const openIndex = line.indexOf("(");
		const closeIndex = line.indexOf(")");

		if (openIndex !== -1 && closeIndex !== -1) {
			const urlPath = line.slice(openIndex + 1, closeIndex);

			const srcIndex = urlPath.indexOf("src");

			if (srcIndex !== -1) {
				line =
					line.slice(0, openIndex + 1) +
					urlPath.slice(srcIndex + 4) +
					line.slice(closeIndex);
			}
		}

		yield `> ${line.trim()}`;
	}

	yield "> ```";
}
