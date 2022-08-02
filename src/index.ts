import { Jukebot } from './classes/Jukebot';
import { getAuth } from './functions/getAuth';

const { token } = getAuth();

new Jukebot(token);
