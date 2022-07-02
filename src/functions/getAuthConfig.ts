import Auth from '../types/Auth';
import { Colours } from '../types/Colours';

let rememberedAuth: Auth | undefined = undefined;

export function getAuth(): Auth {
    if (rememberedAuth) return rememberedAuth;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        rememberedAuth = require('../../auth.json') as Auth;
        return rememberedAuth;
    } catch (error) {
        if (error instanceof Error && error.message.includes('auth.json')) {
            console.log(`missing ${Colours.FgMagenta}auth.json${Colours.Reset} file in root directory`);
        } else console.log(error);
        process.exit(1);
    }
}
