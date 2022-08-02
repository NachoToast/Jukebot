import { DuplicateLogBehaviour, Logger } from '../classes/template/Logger';
import { Devmode } from './Devmode';

const behaviour = Devmode ? DuplicateLogBehaviour.Replace : DuplicateLogBehaviour.Append;

export const Loggers = {
    warn: new Logger(`warnings.log`, behaviour, Devmode),
    error: new Logger(`errors.log`, behaviour, Devmode),
    info: new Logger(`info.log`, behaviour, Devmode),
};
