import { AudioResource, createAudioResource } from '@discordjs/voice';
import { GuildMember } from 'discord.js';
import { stream, YouTubeStream, YouTubeVideo } from 'play-dl';
import { promisify } from 'util';
import { Config } from '../../global/Config';
import { chooseRandomDisc } from '../../functions/chooseRandomDisc';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import { JsonMusicDisc } from './types';

const wait = promisify(setTimeout);

export class MusicDisc {
    public readonly origin: JukebotInteraction;
    public readonly addedAt: number = Date.now();
    public readonly addedBy: GuildMember;

    public readonly url: string;
    public readonly title: string;
    public readonly thumbnail: string;
    public readonly views: number;
    public readonly channel: string;

    /** The duration of this song in seconds. */
    public readonly durationSeconds: number;

    /** The duration of this song in string form.
     * @example '0:12', '3:45', '5:06:07'.
     */
    public readonly durationString: string;

    private _resource?: AudioResource<MusicDisc>;

    public constructor(interaction: JukebotInteraction, video: YouTubeVideo) {
        this.origin = interaction;
        this.addedBy = interaction.member;

        this.url = video.url;
        this.title = video.title || `Unknown Song`;
        this.thumbnail = video.thumbnails.shift()?.url || chooseRandomDisc();
        this.views = video.views;
        this.channel = video.channel?.name || `Unknown Artist`;

        this.durationSeconds = video.durationInSec;
        this.durationString = video.durationRaw;
    }

    public get resource(): AudioResource<MusicDisc> | undefined {
        return this._resource;
    }

    private async _internalPrepare(): Promise<AudioResource<MusicDisc>> {
        const { stream: youtubeStream, type: inputType } = (await stream(this.url)) as YouTubeStream;

        return createAudioResource<MusicDisc>(youtubeStream, {
            inputType,
            metadata: this,
            inlineVolume: true,
        });
    }

    /**
     * Generates and stores an audio resource for future playback.
     * @throws Throws an error if the resource cannot be generated in the
     * {@link Config.timeoutThresholds.generateResource configured} amount of time.
     */
    public async prepare(): Promise<AudioResource<MusicDisc>> {
        if (this._resource) return this._resource;

        const prepareRace: Promise<AudioResource<MusicDisc> | void>[] = [this._internalPrepare()];

        if (Config.timeoutThresholds.generateResource) {
            prepareRace.push(wait(Config.timeoutThresholds.generateResource * 1000));
        }

        const resource = (await Promise.race(prepareRace)) ?? undefined;

        if (resource === undefined) {
            throw new Error(
                `Unable to generate audio resource in reasonable time (${Config.timeoutThresholds.generateResource} seconds)`,
            );
        }

        this._resource = resource;
        return resource;
    }

    /**
     * Un-generates a previously-prepared resource, useful for freeing up memory if this MusicDisc
     * is moved to a later position in the queue.
     */
    public unprepare(): boolean {
        return delete this._resource;
    }

    public toJSON(): JsonMusicDisc {
        return {
            addedAt: this.addedAt,
            addedBy: { id: this.addedBy.id, name: this.addedBy.displayName },
            channel: { id: this.origin.channelId, name: this.origin.channel.name },
            url: this.url,
            title: this.title,
            durationString: this.durationString,
            prepared: !!this._resource,
        };
    }
}
