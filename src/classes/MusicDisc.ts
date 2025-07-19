import { AudioResource } from '@discordjs/voice';
import { EmbedBuilder, GuildMember, TextChannel } from 'discord.js';
import { YouTubeVideo } from 'play-dl';
import { JukebotGlobals } from '../global';
import { DiscImage } from '../types';
import { awaitOrTimeout } from '../util';
import { Cobalt } from './Cobalt';

/** A track that is ready to be prepared and then played. */
export class MusicDisc {
    public readonly requestedById: string;

    public readonly requestedAt: number = Date.now();

    public readonly _requestedIn: TextChannel;

    /** YouTube video URL.*/
    public readonly _url: string;

    public readonly title: string;

    private readonly _thumbnail: string;

    private readonly _views: number;

    /** The duration of this second in seconds. For live videos this will be {@link Infinity infinite}. */
    public readonly durationSeconds: number;

    /** The playback speed of which the song will play at, from 0.5-2 */
    public readonly _playbackSpeed?: number;

    /**
     * The duration of this song in string form.
     *
     * Is `Unknown` for live videos.
     *
     * @example '0:12', '3:45', '5:06:07', 'Unknown'.
     */
    public readonly durationString: string;

    private readonly _channelName?: string;

    private readonly _channelUrl?: string;

    private _resource?: AudioResource<MusicDisc>;

    public constructor(member: GuildMember, channel: TextChannel, video: YouTubeVideo, playbackSpeed: number) {
        this.requestedById = member.id;
        this._requestedIn = channel;
        this._url = video.url;
        this.title = video.title ?? 'Unknown Song';
        this._thumbnail = video.thumbnails.shift()?.url ?? MusicDisc.chooseRandomDiscThumbnail();
        this._views = video.views;
        this.durationSeconds = video.live ? Infinity : video.durationInSec;
        this.durationString = video.live ? 'Unknown' : video.durationRaw;
        this._channelName = video.channel?.name;
        this._channelUrl = video.channel?.url;
        this._playbackSpeed = playbackSpeed;
    }

    /**
     * Generates an audio resource for this music disc.
     *
     * This method is idempotent, meaning that it will only generate a
     * resource once and then return the same resource on subsequent calls.
     *
     * @throws Throws an error if the resource cannot be generated in the configured time.
     */
    public async getResource(): Promise<AudioResource<MusicDisc>> {
        if (this._resource !== undefined) return this._resource;

        const controller = new AbortController();

        const resourcePromise = new Promise<AudioResource<MusicDisc>>((resolve, reject) => {
            new Cobalt(this).getResource(controller).then((res) => {
                if (res !== null) {
                    resolve(res);
                } else {
                    reject();
                }
            });
        });

        this._resource = await awaitOrTimeout(
            resourcePromise,
            JukebotGlobals.config.timeoutThresholds.generateResource,
        );

        return this._resource;
    }

    public destroyResource(): void {
        return void delete this._resource;
    }

    public hasResource(): boolean {
        return this._resource !== undefined;
    }

    /** Sets the title, URL, thumbnail, and description of an embed. */
    public makeFullDescription(embed: EmbedBuilder): void {
        const description: string[] = [`Duration: ${this.durationString}`];

        if (this._views !== 0) {
            description.push(`Views: ${Intl.NumberFormat('en', { notation: 'compact' }).format(this._views)}`);
        }

        if (this._channelName !== undefined) {
            if (this._channelUrl !== undefined) {
                description.push(`Channel: [${this._channelName}](${this._channelUrl})`);
            } else {
                description.push(`Channel: ${this._channelName}`);
            }
        }

        embed
            .setTitle(this.title)
            .setURL(this._url)
            .setThumbnail(this._thumbnail)
            .setDescription(description.join('\n'));
    }

    /** Creates a single-line description of this music disc. */
    public getShortDescription(position: number): string {
        return `${position}. [${this.title}](${this._url}) (${this.durationString})`;
    }

    private static chooseRandomDiscThumbnail(): string {
        const allDiscs = Object.values(DiscImage);

        return allDiscs[Math.floor(Math.random() * allDiscs.length)];
    }
}
