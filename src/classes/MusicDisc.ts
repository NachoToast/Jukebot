import { AudioResource, createAudioResource } from '@discordjs/voice';
import { GuildMember } from 'discord.js';
import { stream, YouTubeStream, YouTubeVideo } from 'play-dl';
import { GuildedInteraction } from '../types/Interactions';
import { chooseRandomDisc } from '../helpers/chooseRandomDisc';

/** A MusicDisc represents stored metadata for a specific song. */
export class MusicDisc {
    public readonly addedBy: GuildMember;
    public readonly addedAt: number;

    public readonly url: string;
    public readonly title: string;
    public readonly thumbnail: string;
    public readonly views: number;
    public readonly channel: string;

    /** The duration of this song in seconds. */
    public readonly durationSeconds: number;

    /** The duration of this song in string form,
     * @example '0:12', '3:45', '5:06:07'.
     */
    public readonly durationString: string;

    private _resource?: AudioResource<MusicDisc>;
    public get resource(): AudioResource<MusicDisc> | undefined {
        return this._resource;
    }

    public constructor(interaction: GuildedInteraction, video: YouTubeVideo) {
        const { url, durationRaw, durationInSec, thumbnails, channel, views, title } = video;

        this.addedBy = interaction.member;
        this.addedAt = Date.now();

        this.title = title || 'Unknown Title';
        this.url = url;
        this.durationSeconds = durationInSec;
        this.durationString = durationRaw;
        this.thumbnail = thumbnails.shift()?.url || chooseRandomDisc();
        this.views = views;
        this.channel = channel?.name || 'Unknown Artist';
    }

    /** Generates and stores an audio resource for future playback.
     * @returns {Promise<AudioResource<MusicDisc>|null} The resource on success, or null on failure.
     */
    public async prepare(): Promise<AudioResource<MusicDisc>> {
        const { stream: youtubeStream, type: inputType } = (await stream(this.url)) as YouTubeStream;
        const resource = createAudioResource<MusicDisc>(youtubeStream, { inputType, metadata: this });
        this._resource = resource;
        return resource;
    }
}
