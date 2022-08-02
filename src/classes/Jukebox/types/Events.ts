import { Jukebox } from '../Jukebox';
import { JukeboxStatus } from './Statuses';

export interface JukeboxEvents {
    /**
     * The Jukebox has been irreversibly destroyed.
     *
     * The event is emitted once, and will always be the final event emitted.
     */
    destroyed: (jukebox: Jukebox) => void;

    stateChange: (oldState: JukeboxStatus, newStats: JukeboxStatus) => void;
}
