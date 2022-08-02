import { EmbedFooterData } from 'discord.js';
import { chooseRandomDisc } from '../../../functions/chooseRandomDisc';
import { QueueLengthInfo } from '../../../functions/getQueueLength';
import { numericalToString } from '../../../functions/timeConverters';
import { MusicDisc } from '../../MusicDisc';

export function makeQueueFooter(
    queue: MusicDisc[],
    data: QueueLengthInfo,
    guildIconUrl: string | null,
): EmbedFooterData | null {
    const queueLength = queue.length;
    if (queueLength === 0) return null;

    const footerText: string[] = new Array(2);

    footerText[0] = `Queue Length: ${queueLength}`;

    if (data.numLiveVideos == queueLength) {
        // only live videos
        footerText[1] = `Queue Time: n/a (All live videos)`;
    } else if (data.numLiveVideos === 0) {
        // no live videos
        footerText[1] = `Queue Time: ${numericalToString(data.totalDuration)}`;
    } else {
        // some live, some non-live videos
        footerText[1] = `Queue Time: ${numericalToString(data.totalDuration)} (Excluding ${
            data.numLiveVideos
        } live video${data.numLiveVideos !== 1 ? `s` : ``})`;
    }

    return { text: footerText.join(` | `), iconURL: guildIconUrl || chooseRandomDisc() };
}
