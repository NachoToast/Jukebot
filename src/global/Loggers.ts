import { DuplicateLogBehaviour, Logger } from '../classes/template/Logger';

const devmode = process.argv.slice(2).includes(`--devmode`);

const behaviour = devmode ? DuplicateLogBehaviour.Replace : DuplicateLogBehaviour.Append;

export const Loggers = {
    warn: new Logger(`warnings.log`, behaviour, devmode),
    error: new Logger(`errors.log`, behaviour, devmode),
    info: new Logger(`info.log`, behaviour, devmode),
};
