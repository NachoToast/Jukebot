let rememberedVersion: string | undefined = undefined;

/**
 * Gets the current version of Jukebot from `process.env.npm_package_version`,
 * or the `package.json` file if unavailable.
 * @example '1.0.6'
 */
export function getVersion(): string {
    if (rememberedVersion !== undefined) return rememberedVersion;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    rememberedVersion = (process.env.npm_package_version || require(`../../package.json`).version) as string;
    return rememberedVersion;
}
