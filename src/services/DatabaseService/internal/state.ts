/* eslint-disable no-await-in-loop */
import { config } from '@config';
import { Color } from '@types';
import { colorize, log, logWithTimeTaken, wait } from '@utils';
import { SQL } from 'bun';
import { createCommandDeploymentsTable } from '../commandDeployments';

export let pg: SQL;

export async function initialise(): Promise<void> {
    const { hostname, port, database, username, password } = config.db;

    let startTime = Date.now();

    let connected = false;

    // Logging In

    pg = new SQL({
        hostname,
        port,
        database,
        username,
        password,

        onconnect: (): void => {
            if (connected) return;

            connected = true;

            logWithTimeTaken(`Connected to PostgreSQL`, startTime);
        },

        onclose: (): void => {
            if (!connected) return;

            log(colorize(`Disconnected from PostgreSQL`, Color.FgRed));

            connected = false;

            attemptReconnectWithBackoff().catch(console.error);
        },
    });

    await pg.connect();

    async function attemptReconnectWithBackoff(): Promise<void> {
        for (let i = 0; i < Infinity; i++) {
            if (connected) break;

            const attemptNumber = (i + 1).toLocaleString();

            log(`Attempting to reconnect to PostgreSQL (try #${attemptNumber})`);

            startTime = Date.now();

            try {
                await pg.connect();

                throw new Error();
            } catch {
                await wait(1_000 * (i + 1) ** 2);
            }
        }
    }

    // Table Creation

    await createCommandDeploymentsTable();
}
