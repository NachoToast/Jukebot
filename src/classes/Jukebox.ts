import { FullInteraction, GuildedInteraction } from '../types/Interactions';
import {
    AudioPlayer,
    AudioPlayerState,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionState,
} from '@discordjs/voice';
import Colours from '../types/Colours';
import { Hopper } from './Hopper';
import { DestroyCallback } from '../types/Jukebox';
import { AddResponse } from '../types/Hopper';
import { stream, YouTubeStream } from 'play-dl';
import { Jukebot } from '../client/Client';

/** Each Jukebox instance handles audio playback for a single guild. */
export class Jukebox {
    /** The interaction that created this instance. */
    private readonly _startingInteraction: FullInteraction;
    /** The name of the guild of the `_startingInteraction`, for simplified logging. */
    private readonly _name: string;

    /** A function to run on `cleanup` */
    private readonly _destroyCallback: DestroyCallback;

    /** The latest interaction that caused this instance to join or move to a voice channel. */
    private _latestInteraction: FullInteraction;

    private _hopper: Hopper;

    private _connection: VoiceConnection;
    private _player: AudioPlayer;

    public constructor(interaction: FullInteraction, destroyCallback: DestroyCallback) {
        this._startingInteraction = interaction;
        this._latestInteraction = interaction;

        this._name = interaction.guild.name;
        this._destroyCallback = destroyCallback;
        this._hopper = new Hopper();

        this.handleConnectionError = this.handleConnectionError.bind(this);
        this.handleConnectionStateChange = this.handleConnectionStateChange.bind(this);

        this.handlePlayerError = this.handlePlayerError.bind(this);
        this.handlePlayerStateChange = this.handlePlayerStateChange.bind(this);

        this._connection = joinVoiceChannel({
            channelId: this._latestInteraction.member.voice.channelId,
            guildId: this._latestInteraction.guildId,
            adapterCreator: this._latestInteraction.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        this._connection.on('error', this.handleConnectionError);
        this._connection.on('stateChange', this.handleConnectionStateChange);

        this._player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

        this._player.on('error', this.handlePlayerError);
        this._player.on('stateChange', this.handlePlayerStateChange);

        this._connection.subscribe(this._player);
    }

    private handleConnectionError(error: Error): void {
        console.log(`[${this._name}] (connection) ${Colours.FgRed}error${Colours.Reset}`, error);
    }

    private handleConnectionStateChange(
        { status: oldStatus }: VoiceConnectionState,
        { status: newStatus }: VoiceConnectionState,
    ): void {
        if (oldStatus === newStatus) return;
        console.log(`[${this._name}] (connection) ${oldStatus} => ${newStatus}`);
    }

    private handlePlayerError(error: Error): void {
        console.error(`[${this._name}] (player) ${Colours.FgRed}error${Colours.Reset}`, error);
    }

    private handlePlayerStateChange(
        { status: oldStatus }: AudioPlayerState,
        { status: newStatus }: AudioPlayerState,
    ): void {
        if (oldStatus === newStatus) return;
        console.debug(`[${this._name}] (player) ${oldStatus} => ${newStatus}`);
    }

    public async add(interaction: GuildedInteraction): Promise<AddResponse> {
        const res = await this._hopper.add(interaction);
        if (!res.failure) {
            // TODO: logic for a successful request
            if (this._player.state.status !== AudioPlayerStatus.Playing) {
                this.nextSong(true);
            }
        }

        return res;
    }

    /** Playes the next song in the queue.
     * @param {boolean} [silent=false] Whether to announce the next song in chat.
     */
    public async nextSong(silent: boolean = false): Promise<void> {
        const nextDisc = this._hopper.inventory.shift();
        if (!nextDisc) return;

        const youtTubeStream = (await stream(nextDisc.url)) as YouTubeStream;
        const resource = createAudioResource(youtTubeStream.stream, {
            inputType: youtTubeStream.type,
            inlineVolume: !!Jukebot.config.volumeModifier,
            metadata: nextDisc,
        });

        if (Jukebot.config.volumeModifier) {
            resource.volume?.setVolume(Jukebot.config.volumeModifier);
        }

        this._player.play(resource);

        if (!silent) {
            await this._latestInteraction.channel.send(
                `now playing ${nextDisc.title} (requested by __${nextDisc.addedBy.nickname}__)`,
            );
        }
    }

    /** Removes listeners, stops playblack, and destroys connection.
     *
     * Should only be called when the Jukebox needs to kill itself.
     */
    public async cleanup(): Promise<boolean> {
        this._player.removeAllListeners();
        this._player.stop(true);

        this._connection.removeAllListeners();
        this._connection.destroy();

        return this._destroyCallback(this._startingInteraction.guildId);
    }
}
