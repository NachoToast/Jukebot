import { getCommitHash } from "./modules/EnvModule/getCommitHash";
import { getVersion } from "./modules/EnvModule/getVersion";
import { readFromEnv } from "./modules/EnvModule/readFromEnv";

export const config = {
	/** Auto-generated. */
	startTime: new Date(),

	/** Auto-generated. */
	version: getVersion(),

	/** Auto-generated. */
	commitHash: getCommitHash(),

	/**
	 * Discord Bot API Token.
	 *
	 * **Never share this!**
	 */
	discordToken: readFromEnv("DISCORD_BOT_TOKEN", (token) =>
		token.isRequired().cannotBe("abcdefg", "this is the example value"),
	),

	/**
	 * Channel to send errors to.
	 *
	 * If not set, errors will be sent to the console.
	 *
	 * This is basically useless since the code I write is perfect and never has any errors.
	 */
	errorChannelId: readFromEnv("ERROR_CHANNEL_ID", (id) =>
		id.hasDefaultValueOf("").cannotBe("1234567890", "this is the example value").isNullable(),
	),

	/**
	 * Role to ping when errors occur.
	 *
	 * If not set, no pings will be made (but messages will still be sent).
	 *
	 * Needs {@link config.errorChannelId} to be set as well.
	 */
	developerRoleId: readFromEnv("DEVELOPER_ROLE_ID", (id) =>
		id
			.hasDefaultValueOf("")
			.cannotBe("1234567890", "this is the example value")
			.isNullable()
			.reliesOn("ERROR_CHANNEL_ID"),
	),

	environment: readFromEnv("NODE_ENV", (env) => env.hasDefaultValueOf("development")),

	/**
	 * Maximum number of songs that can be in the queue.
	 *
	 * Prevents high memory usage (e.g. if someone queues up a morbillion songs).
	 *
	 * Must be an integer above 0, may be {@link Number.POSITIVE_INFINITY}.
	 *
	 * @default 1000
	 */
	maxQueueSize: readFromEnv("MAX_QUEUE_SIZE", (queueSize) =>
		queueSize.hasDefaultValueOf("1000").mustBeInteger().zeroMeansInfinity().minValue(1),
	),

	/**
	 * Number of seconds to wait for Discord login to complete before timing out.
	 *
	 * Mainly useful in deployment environments to prevent hanging.
	 *
	 * Must be an integer above 0, may be {@link Number.POSITIVE_INFINITY}.
	 *
	 * @default 30
	 */
	discordLoginTimeout: readFromEnv("DISCORD_LOGIN_TIMEOUT", (timeout) =>
		timeout.hasDefaultValueOf("30").mustBeInteger().zeroMeansInfinity().minValue(1),
	),

	/** PostgreSQL database connection settings. */
	db: {
		hostname: readFromEnv("DB_HOST", (host) => host.isRequired()),

		port: readFromEnv("DB_PORT", (port) =>
			port
				.isRequired()
				.customTransform((x) => x.split(":").at(-1) ?? x)
				.mustBeInteger()
				.withinValidPortRange(),
		),

		database: readFromEnv("DB_NAME", (name) => name.isRequired()),

		username: readFromEnv("DB_USER", (user) => user.isRequired()),

		password: readFromEnv("DB_PASSWORD", (password) => password.isRequired()),
	},
} as const;
