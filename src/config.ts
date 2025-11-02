import { EnvModule } from '@modules';

export const config = {
    /** Auto-generated. */
    startTime: new Date(),

    /** Auto-generated. */
    version: EnvModule.getVersion(),

    /** Auto-generated. */
    commitHash: EnvModule.getCommitHash(),

    /**
     * Discord Bot API Token.
     *
     * **Never share this!**
     */
    discordToken: EnvModule.readFromEnv('DISCORD_BOT_TOKEN', (token) =>
        token.isRequired().cannotBe('abcdefg', 'this is the example value'),
    ),

    /**
     * Channel to send errors to.
     *
     * If not set, errors will be sent to the console.
     *
     * This is basically useless since the code I write is perfect and never has any errors.
     */
    errorChannelId: EnvModule.readFromEnv('ERROR_CHANNEL_ID', (id) =>
        id.hasDefaultValueOf('').cannotBe('1234567890', 'this is the example value').isNullable(),
    ),

    /**
     * Role to ping when errors occur.
     *
     * If not set, no pings will be made (but messages will still be sent).
     *
     * Needs {@link config.errorChannelId} to be set as well, obviously.
     */
    developerRoleId: EnvModule.readFromEnv('DEVELOPER_ROLE_ID', (id) =>
        id
            .hasDefaultValueOf('')
            .cannotBe('1234567890', 'this is the example value')
            .isNullable()
            .reliesOn('ERROR_CHANNEL_ID'),
    ),

    environment: EnvModule.readFromEnv('NODE_ENV', (env) => env.hasDefaultValueOf('development')),

    /**
     * Maximum number of songs that can be in the queue.
     *
     * Prevents high memory usage (e.g. if someone queues up a morbillion songs).
     *
     * Must be an integer above 0, may be {@link Number.POSITIVE_INFINITY}.
     *
     * @default 1000
     */
    maxQueueSize: EnvModule.readFromEnv('MAX_QUEUE_SIZE', (queueSize) =>
        queueSize.hasDefaultValueOf('1000').mustBeInteger().zeroMeansInfinity().minValue(1),
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
    discordLoginTimeout: EnvModule.readFromEnv('DISCORD_LOGIN_TIMEOUT', (timeout) =>
        timeout.hasDefaultValueOf('30').mustBeInteger().zeroMeansInfinity().minValue(1),
    ),

    /** PostgreSQL database connection settings. */
    db: {
        hostname: EnvModule.readFromEnv('DB_HOST', (host) => host.isRequired()),

        port: EnvModule.readFromEnv('DB_PORT', (port) =>
            port
                .isRequired()
                .customTransform((x) => x.split(':').at(-1) ?? x)
                .mustBeInteger()
                .withinValidPortRange(),
        ),

        database: EnvModule.readFromEnv('DB_NAME', (name) => name.isRequired()),

        username: EnvModule.readFromEnv('DB_USER', (user) => user.isRequired()),

        password: EnvModule.readFromEnv('DB_PASSWORD', (password) => password.isRequired()),
    },
} as const;
