import Colours from '../types/Colours';
import Config from '../types/Config';

export function getConfig(): Config {
    // loading config
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const config: Config = require('../../config.json');
        return config;
    } catch (error) {
        if (error instanceof Error && error.message.includes('config.json')) {
            console.log(`missing ${Colours.FgMagenta}config.json${Colours.Reset} file in root directory`);
        } else console.log(error);
        process.exit(1);
    }
}
