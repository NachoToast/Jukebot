import { AudioResource, createAudioResource } from '@discordjs/voice';
import { GuildMember } from 'discord.js';
import { stream, YouTubeStream, YouTubeVideo } from 'play-dl';
import { chooseRandomDisc } from '../functions/chooseRandomDisc';
import { JukebotInteraction } from '../types/JukebotInteraction';
import { Jukebot } from './Jukebot';

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

        if (interaction.member instanceof GuildMember) {
            this.addedBy = interaction.member;
        } else throw new Error('Non-GuildMember tried to create a MusicDisc');

        this.url = video.url;
        this.title = video.title || 'Unknown Song';
        this.thumbnail = video.thumbnails.shift()?.url || chooseRandomDisc();
        this.views = video.views;
        this.channel = video.channel?.name || 'Unknown Artist';

        this.durationSeconds = video.durationInSec;
        this.durationString = video.durationRaw;
    }

    /**Generates and stores an audio resource for future playback. */
    public async prepare(): Promise<AudioResource<MusicDisc>> {
        if (this._resource) return this._resource;

        const { stream: youtubeStream, type: inputType } = (await stream(this.url)) as YouTubeStream;

        const resource = createAudioResource<MusicDisc>(youtubeStream, { inputType, metadata: this });

        this._resource = resource;
        return this._resource;
    }

    public unprepare(jukebot: Jukebot): void {
        if (!this._resource) {
            jukebot.warnLogger.log(`Tried to remove ungenerated resource from MusicDisc, ${this.title}`);
            return;
        }
        delete this._resource;
    }
}
