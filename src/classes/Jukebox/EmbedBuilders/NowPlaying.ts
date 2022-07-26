import moment from 'moment';
import { numericalToString } from '../../../functions/timeConverters';
import { ActiveJukeboxStatus } from '../types';

/** Makes a "now playing X" embed. */
export function makeNowPlayingEmbed(status: ActiveJukeboxStatus): string {
    const disc = status.playing;

    const timeElapsed = Math.floor((Date.now() - status.playingSince) / 1000);
    const timeLeft = disc.durationSeconds - timeElapsed;

    return `Now playing **${disc.title}** [${numericalToString(timeElapsed)} / ${
        disc.durationString
    } (${numericalToString(timeLeft)} left)] (*requested by ${disc.addedBy.displayName} ${moment(
        disc.addedAt,
    ).fromNow()}*)`;
}
