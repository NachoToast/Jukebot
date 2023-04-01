import { Client, Events } from 'discord.js';
import { Colours } from '../types/Colours';

/**
 * Attempts to login to Discord using the bot's token.
 *
 * If it fails to login within the given timed period, it will exit the process.
 */
export async function loginOrDie(client: Client, token: string, loginTimeout: number, devmode: boolean): Promise<void> {
    const die =
        loginTimeout === 0
            ? null
            : setTimeout(() => {
                  console.log(`Took too long to login (max ${loginTimeout}s), exiting...`);
                  process.exit(1);
              }, loginTimeout * 1_000);

    try {
        client.once(Events.ClientReady, (c) => {
            console.log(`${c.user.tag} logged in${devmode ? ' (development)' : ''}`);
        });
        await client.login(token);
        if (die !== null) clearTimeout(die);
    } catch (error) {
        if (error instanceof Error && error.name === 'Error [TokenInvalid]') {
            console.log(`Invalid token in ${Colours.FgMagenta}config.json${Colours.Reset} file`);
        } else {
            console.log('Login Error', error);
        }
        process.exit(1);
    }
}
