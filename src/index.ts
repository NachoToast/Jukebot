import { Jukebot as Client } from './classes/Client';
import { Jukebot } from './classes/Jukebot';
import { getAuth } from './helpers/getAuthConfig';

// new Client();

const { token } = getAuth();
const devmode = process.argv.slice(2).includes('--devmode');

new Jukebot(token, devmode);
