import { GuildMember } from 'discord.js';
import { GuildedInteraction } from '../types/Interactions';
import { defaultDiscArray, DiscImages, InputDiscData } from '../types/MusicDisc';
import { stringToNumerical } from '../helpers/timeConverters';

/** MusicDisc instances represent stored data for a specific song,
 * such as title, duration, and who requested it.
 */
export class MusicDisc {
    public readonly addedBy: GuildMember;
    public readonly addedAt: number;

    public readonly url: string;
    public readonly title: string;
    public readonly thumbnail: string;

    /** The duration of this song in seconds. */
    public readonly duration: number;

    /** The duration of this song in string form,
     * @example '0:12', '3:45', '5:06:07'.
     */
    public readonly durationString: string;

    public constructor(interaction: GuildedInteraction, data: InputDiscData) {
        this.addedBy = interaction.member;
        this.addedAt = Date.now();

        this.title = data.title;
        this.url = data.url;
        this.durationString = data.duration || '??:??';
        this.thumbnail = data.thumbnail || MusicDisc.chooseRandomDisc();

        this.duration = data.duration ? stringToNumerical(data.duration) : 0;
    }

    /** If we can't find a thumbnail URL, this gets a random music disc image. */
    private static chooseRandomDisc(): DiscImages {
        const randomIndex = Math.floor(Math.random() * defaultDiscArray.length);
        return defaultDiscArray[randomIndex];
    }
}
