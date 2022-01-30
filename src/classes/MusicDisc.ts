import { GuildMember } from 'discord.js';
import { YouTubeVideo } from 'play-dl';
import { GuildedInteraction } from '../types/Interactions';
import { defaultDiscArray, DiscImages } from '../types/MusicDisc';

/** A MusicDisc represents stored metadata for a specific song. */
export class MusicDisc {
    public readonly addedBy: GuildMember;
    public readonly addedAt: number;

    public readonly url: string;
    public readonly title: string;
    public readonly thumbnail: string;
    public readonly likes: number;

    /** The duration of this song in seconds. */
    public readonly durationSeconds: number;

    /** The duration of this song in string form,
     * @example '0:12', '3:45', '5:06:07'.
     */
    public readonly durationString: string;

    public constructor(interaction: GuildedInteraction, video: YouTubeVideo, title: string) {
        const { url, durationRaw, durationInSec, thumbnails, likes } = video;

        this.addedBy = interaction.member;
        this.addedAt = Date.now();

        this.title = title;
        this.url = url;
        this.durationString = durationRaw;
        this.thumbnail = thumbnails.shift()?.url || MusicDisc.chooseRandomDisc();
        this.likes = likes;

        this.durationSeconds = durationInSec;
    }

    /** If there isn't thumbnail URL, this gets a random music disc image. */
    private static chooseRandomDisc(): DiscImages {
        const randomIndex = Math.floor(Math.random() * defaultDiscArray.length);
        return defaultDiscArray[randomIndex];
    }
}
