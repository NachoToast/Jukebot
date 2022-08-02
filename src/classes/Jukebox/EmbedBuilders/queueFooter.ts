import { EmbedFooterData } from 'discord.js';
import { chooseRandomDisc } from '../../../functions/chooseRandomDisc';

/**
 * Makes the "Queue Length: X, Queue Time: Y" footer text for an embed.
 * @param {number} queueSize Number of items in the queue.
 * @param {number} numLiveVideos Number of live videos in the queue.
 * @param {string} totalDuration Total duration of the queue, e.g. "12:34:56".
 * @param {string} [icon] Icon image to display, optional.
 *
 * @example "Queue Length: 155 | Queue Time: 10:38:24"
 */
export function makeQueueFooter(
    queueSize: number,
    numLiveVideos: number,
    totalDuration: string,
    icon?: string | null,
): EmbedFooterData {
    const footerText: string[] = new Array(2);

    footerText[0] = `Queue Length: ${queueSize}`;

    if (numLiveVideos == queueSize) {
        // only live videos
        footerText[1] = `Queue Time: n/a (All live videos)`;
    } else if (numLiveVideos === 0) {
        // no live videos
        footerText[1] = `Queue Time: ${totalDuration}`;
    } else {
        // some live, some non-live videos
        footerText[1] = `Queue Time: ${totalDuration} (Excluding ${numLiveVideos} live video${
            numLiveVideos !== 1 ? `s` : ``
        })`;
    }

    return { text: footerText.join(` | `), iconURL: icon || chooseRandomDisc() };
}
