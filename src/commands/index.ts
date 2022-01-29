import Command from '../types/Command';
import util from './util';
import music from './music';

const commandList: Command[] = [...util, ...music];

export default commandList;
