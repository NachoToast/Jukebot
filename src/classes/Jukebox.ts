import { FullInteraction, GuildedInteraction } from '../types/Interactions';
import {
    AudioPlayer,
    AudioPlayerState,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionState,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import Colours from '../types/Colours';
import { Hopper } from './Hopper';
import { CleanUpReasons, CurrentStatus, DestroyCallback, pausedStates } from '../types/Jukebox';
import { AddResponse } from '../types/Hopper';
import { stream, YouTubeStream } from 'play-dl';
import { Jukebot } from './Client';
import { InteractionReplyOptions, MessageEmbed } from 'discord.js';
import Messages from '../types/Messages';

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

    public current: CurrentStatus = {
        active: false,
        idleSince: Date.now(),
        wasPlaying: null,
        leaveTimeout: setTimeout(() => this.disconnectTimeout(), Jukebot.config.inactivityTimeout * 1000),
    };

    public constructor(interaction: FullInteraction, destroyCallback: DestroyCallback) {
        this._startingInteraction = interaction;
        this._latestInteraction = interaction;

        this._name = interaction.guild.name;
        this._destroyCallback = destroyCallback;
        this._hopper = new Hopper(this);

        this.handleConnectionError = this.handleConnectionError.bind(this);
        this.handleConnectionStateChange = this.handleConnectionStateChange.bind(this);

        this.handlePlayerError = this.handlePlayerError.bind(this);
        this.handlePlayerStateChange = this.handlePlayerStateChange.bind(this);

        this.disconnectTimeout = this.disconnectTimeout.bind(this);

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

        this.postContructionReadyCheck();
    }

    /** Just make sure the connection (made on class instantiation) connects in time. */
    private async postContructionReadyCheck() {
        try {
            await entersState(this._connection, VoiceConnectionStatus.Ready, Jukebot.config.maxReadyTime * 1000);
        } catch (error) {
            console.log(
                `[${this._name}] (connection) ${Colours.FgRed}unable to be ready in ${Jukebot.config.maxReadyTime} seconds${Colours.Reset}`,
            );
            await this.cleanup(CleanUpReasons.ConnectionTimeout);
        }
    }

    private async handleConnectionError(error: Error): Promise<void> {
        console.log(`[${this._name}] (connection) ${Colours.FgRed}error${Colours.Reset}`, error);
        await this.cleanup(CleanUpReasons.ConnectionError);
    }

    private handleConnectionStateChange(
        { status: oldStatus }: VoiceConnectionState,
        { status: newStatus }: VoiceConnectionState,
    ): void {
        if (oldStatus === newStatus) return;
        console.log(`[${this._name}] (connection) ${oldStatus} => ${newStatus}`);
    }

    private async handlePlayerError(error: Error): Promise<void> {
        console.log(`[${this._name}] (player) ${Colours.FgRed}error${Colours.Reset}`, error);
        await this.cleanup(CleanUpReasons.PlayerError);
    }

    private async handlePlayerStateChange(
        { status: oldStatus }: AudioPlayerState,
        { status: newStatus }: AudioPlayerState,
    ): Promise<void> {
        if (oldStatus === newStatus) return;
        console.log(`[${this._name}] (player) ${oldStatus} => ${newStatus}`);

        if (pausedStates.includes(newStatus)) {
            if (this.readyToPlay) {
                await this.nextSong();
            } else {
                this.current = {
                    active: false,
                    idleSince: Date.now(),
                    wasPlaying: this.current.active
                        ? {
                              musicDisc: this.current.musicDisc,
                              for: Math.floor((Date.now() - this.current.playingSince) / 1000),
                          }
                        : null,
                    leaveTimeout: setTimeout(() => this.disconnectTimeout(), Jukebot.config.inactivityTimeout * 1000),
                };
            }
        }
    }

    /** Whether this Jukebox instance is ready to play a song.
     *
     * - Has successfully connected to a voice channel.
     * - Player is ready and **not currently playing anything**.
     * - Queue has at least 1 item in it.
     */
    private get readyToPlay(): boolean {
        const playerReady = this._player.state.status === AudioPlayerStatus.Idle;
        const connectionReady = this._connection.state.status === VoiceConnectionStatus.Ready;
        const itemReady = !!this._hopper.inventory.length;
        return playerReady && connectionReady && itemReady;
    }

    public async add(interaction: GuildedInteraction): Promise<AddResponse> {
        const res = await this._hopper.add(interaction);
        if (!res.failure && this.readyToPlay) {
            await this.nextSong(true);
            if (this.current.active) {
                const embed = this._hopper.makeNowPlayingEmbed(interaction, this.current.musicDisc);
                return { failure: false, output: { embeds: [embed] } };
            } else {
                return {
                    failure: false,
                    output: { content: 'started playing but no activity, you should never see this message' },
                };
            }
        }
        return res;
    }

    public getNowPlaying(): InteractionReplyOptions {
        if (!this.current.active) {
            return { content: Messages.NotPlaying, ephemeral: true };
        }
        const embed = this._hopper.makeNowPlayingEmbed(this._latestInteraction, this.current.musicDisc, true);
        return { embeds: [embed] };
    }

    public getQueue(): MessageEmbed {
        return this._hopper.makeQueueEmbed(this._latestInteraction);
    }

    /** Playes the next song in the queue.
     *
     * This will replace the currently playing song.
     *
     * Will error if the player does not start playing in the configured amount of time.
     *
     * @param {boolean} [silent=false] Whether to announce the next song in chat.
     */
    public async nextSong(silent: boolean = false): Promise<boolean> {
        const nextDisc = this._hopper.inventory.shift();
        if (!nextDisc) return false;

        const youtTubeStream = (await stream(nextDisc.url)) as YouTubeStream;

        const resource = createAudioResource(youtTubeStream.stream, {
            inputType: youtTubeStream.type,
            // inlineVolume: !!Jukebot.config.volumeModifier,
            metadata: nextDisc,
        });

        // if (Jukebot.config.volumeModifier) {
        //     resource.volume?.setVolume(Jukebot.config.volumeModifier);
        // }

        this._player.play(resource);

        try {
            await entersState(this._player, AudioPlayerStatus.Playing, Jukebot.config.maxReadyTime * 1000);
        } catch (error) {
            console.log(
                `[${this._name}] (player) ${Colours.FgRed}unable to start playing in ${Jukebot.config.maxReadyTime} seconds${Colours.Reset}`,
            );
            await this.cleanup(CleanUpReasons.PlayerTimeout);
            return false;
        }

        let playingSince = Date.now();

        if (!this.current.active) {
            clearTimeout(this.current.leaveTimeout);
            if (this.current.wasPlaying?.for) {
                playingSince -= this.current.wasPlaying.for * 1000;
            }
        }
        this.current = {
            active: true,
            musicDisc: nextDisc,
            playingSince,
        };

        if (!silent) {
            const nextEmbed = this.getNowPlaying();
            await this._latestInteraction.channel.send({ ...nextEmbed });
        }

        return true;
    }

    /** Called once the bot has been idle for more than the configure idle time.
     * Disconnecting the bot from the voice channel and terminating the instance.
     */
    private async disconnectTimeout(): Promise<void> {
        if (this.current.active) {
            console.log(`[${this._name}] disconnect timeout got called despite being active, this should never happen`);
            return;
        }

        if (!Jukebot.config.inactivityTimeout) return;
        await this.cleanup(CleanUpReasons.Inactivity);
    }

    /** Removes listeners, stops playblack, and destroys connection.
     *
     * Should only be called when the Jukebox needs to kill itself.
     */
    public async cleanup(reason: CleanUpReasons): Promise<boolean> {
        this._player.removeAllListeners();
        this._player.stop(true);

        this._connection.removeAllListeners();

        try {
            this._connection.destroy();
        } catch (error) {
            // don't care
        }

        switch (reason) {
            case CleanUpReasons.ClientRequest:
                break;
            case CleanUpReasons.ConnectionError:
            case CleanUpReasons.ConnectionTimeout:
                await this._latestInteraction.channel.send({ content: `Operation aborted due to ${reason}` });
                break;
            default:
                await this._latestInteraction.channel.send({ content: `Left voice channel due to ${reason}` });
        }

        return this._destroyCallback(this._startingInteraction.guildId);
    }
}
