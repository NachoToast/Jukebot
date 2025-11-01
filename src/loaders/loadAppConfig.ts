/*
    Loads environment variables and other app-wide config settings.
*/

import { readFromEnv } from '@env-module';
import type { AppConfig } from '@types';

export function loadAppConfig(): AppConfig {
    const discordToken = readFromEnv('DISCORD_BOT_TOKEN', (token) =>
        token.isRequired().cannotBe('abcdefg', 'this is the example value'),
    );

    const maxQueueSize = readFromEnv('MAX_QUEUE_SIZE', (queueSize) =>
        queueSize
            .hasDefaultValueOf('1000')
            .mustBeInteger()
            .zeroMeansInfinity()
            .minValue(1),
    );

    const discordLoginTimeout = readFromEnv(
        'DISCORD_LOGIN_TIMEOUT',
        (timeout) =>
            timeout
                .hasDefaultValueOf('30')
                .mustBeInteger()
                .zeroMeansInfinity()
                .minValue(1),
    );

    return { discordToken, maxQueueSize, discordLoginTimeout };
}
