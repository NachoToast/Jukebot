import { AudioResource, createAudioResource } from '@discordjs/voice';
import { ChatInputCommandInteraction } from 'discord.js';
import { stream, YouTubeVideo } from 'play-dl';
import { JukebotGlobals } from '../global';
import { DiscImage } from '../types';
import { awaitOrTimeout } from '../util';

/** A track that is ready to be prepared and then played. */
export class MusicDisc {
    /** The interaction that lead to the creation of this music disc. */
    public readonly origin: ChatInputCommandInteraction<'cached' | 'raw'>;

    /** YouTube video URL for this music disc. */
    public readonly url: string;

    public readonly title: string;

    public readonly thumbnail: string;

    public readonly views: number;

    public readonly channel: string;

    public readonly isLive: boolean;

    /**
     * The duration of this second in seconds. For live videos this will be {@link Infinity infinite}.
     */
    public readonly durationSeconds: number;

    /**
     * The duration of this song in string form.
     * @example '0:12', '3:45', '5:06:07', 'Infinity'.
     */
    public readonly durationString: string;

    private _resource?: AudioResource<MusicDisc>;

    public constructor(interaction: ChatInputCommandInteraction<'cached' | 'raw'>, video: YouTubeVideo) {
        this.origin = interaction;
        this.url = video.url;
        this.title = video.title ?? 'Unknown Song';
        this.thumbnail = video.thumbnails.shift()?.url ?? MusicDisc.chooseRandomDiscThumbnail();
        this.views = video.views ?? 0;
        this.channel = video.channel?.name ?? 'Unknown Artist';
        this.isLive = video.live;
        this.durationSeconds = video.live ? Infinity : video.durationInSec;
        this.durationString = video.live ? 'Infinity' : video.durationRaw;
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

        const resourcePromise = new Promise<AudioResource<MusicDisc>>((resolve) => {
            stream(this.url).then(({ stream, type }) => {
                const res = createAudioResource<MusicDisc>(stream, {
                    inputType: type,
                    metadata: this,
                    inlineVolume: JukebotGlobals.config.volumeModifier !== 1,
                });

                if (JukebotGlobals.config.volumeModifier !== -1) {
                    if (res.volume === undefined) {
                        this.origin.channel
                            ?.send({ content: `Unable to create volume transformer for ${this.url}` })
                            .catch(() => null);
                    } else res.volume.setVolume(JukebotGlobals.config.volumeModifier);
                }

                resolve(res);
            });
        });

        this._resource = await awaitOrTimeout(
            resourcePromise,
            JukebotGlobals.config.timeoutThresholds.generateResource,
            `Unable to load "${this.title}" (${this.durationString}) in a reasonable amount of time (${JukebotGlobals.config.timeoutThresholds.generateResource} seconds)`,
        );

        return this._resource;
    }

    public destroyResource(): void {
        return void delete this._resource;
    }

    public static chooseRandomDiscThumbnail(): string {
        const allDiscs = Object.values(DiscImage);

        return allDiscs[Math.floor(Math.random() * allDiscs.length)];
    }
}
