import { Jukebot } from './classes/Jukebot';
import { getAuth } from './functions/getAuthConfig';

const { token } = getAuth();
const devmode = process.argv.slice(2).includes(`--devmode`);

new Jukebot(token, devmode);
