import {
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    entersState,
    NoSubscriberBehavior,
    StreamType,
} from '@discordjs/voice';
import { GuildMember } from 'discord.js';
import { stream, YouTubeStream, YouTubeVideo } from 'play-dl';
import { GuildedInteraction } from '../types/Interactions';
import { defaultDiscArray, DiscImages } from '../types/MusicDisc';
import ytdl from 'ytdl-core';
import internal from 'stream';
import { promisify } from 'util';

const wait = promisify(setTimeout);

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

    private _compatibilityMode = false;
    public get compatibilityMode(): boolean {
        return this._compatibilityMode;
    }

    public constructor(interaction: GuildedInteraction, video: YouTubeVideo) {
        const { url, durationRaw, durationInSec, thumbnails, channel, views, title } = video;

        this.addedBy = interaction.member;
        this.addedAt = Date.now();

        this.title = title || 'Unknown Title';
        this.url = url;
        this.durationSeconds = durationInSec;
        this.durationString = durationRaw;
        this.thumbnail = thumbnails.shift()?.url || MusicDisc.chooseRandomDisc();
        this.views = views;
        this.channel = channel?.name || 'Unknown Artist';
    }

    /** Generates and stores an audio resource for future playback.
     * @returns {Promise<AudioResource<MusicDisc>|null} The resource on success, or null on failure.
     */
    public async prepare(): Promise<AudioResource<MusicDisc> | undefined> {
        console.log(`${this.title} preparing`);
        const primaryStream = async () => (await stream(this.url)) as YouTubeStream;
        const secondaryStream = () => ytdl(this.url, { filter: 'audioonly', quality: 'highestaudio ' });

        const { stream: testStream, type: inputType } = await primaryStream();
        const primarySuccess = await MusicDisc.dryRun(testStream, inputType);

        if (primarySuccess) {
            console.log('play-dl success');
            const resource = createAudioResource<MusicDisc>((await primaryStream()).stream, {
                inputType,
                metadata: this,
            });
            this._resource = resource;
            return resource;
        } else console.log('play-dl failure');

        const nextStream = secondaryStream();
        const secondarySuccess = await MusicDisc.dryRun(nextStream, StreamType.Arbitrary);
        if (secondarySuccess) {
            console.log('ytdl success');
            const resource = createAudioResource<MusicDisc>(secondaryStream(), {
                inputType: StreamType.Arbitrary,
                metadata: this,
            });
            this._compatibilityMode = true;
            this._resource = resource;
            return resource;
        } else console.log('ytdl failure');

        return;
    }

    /** Does a dry run by making a player and seeing if it actually plays the resource,
     * this is needed due to a play-dl bug, in which case we should resort to using ytdl
     * [Discord server link](https://discord.com/channels/888998674716315679/888999501526880256/937640496203956284)
     */
    private static async dryRun(stream: internal.Readable, inputType: StreamType): Promise<boolean> {
        const fakePlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        let success = false;
        try {
            await entersState(fakePlayer, AudioPlayerStatus.Idle, 5_000);
            const fakeResource = createAudioResource(stream, { inputType });
            fakePlayer.play(fakeResource);
            await entersState(fakePlayer, AudioPlayerStatus.Playing, 5_000);

            // test to make sure it doesn't stop playing instantly (the bug)
            await wait(300);
            success = fakePlayer.state.status === AudioPlayerStatus.Playing;
        } catch (error) {
            success = false;
        }

        // cleanup
        try {
            fakePlayer.removeAllListeners();
            fakePlayer.stop(true);
        } catch (error) {
            // nothing
        }

        return success;
    }

    /** If there isn't thumbnail URL, this gets a random music disc image. */
    private static chooseRandomDisc(): DiscImages {
        const randomIndex = Math.floor(Math.random() * defaultDiscArray.length);
        return defaultDiscArray[randomIndex];
    }
}
