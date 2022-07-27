import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    DiscordGatewayAdapterCreator,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import { InteractionReplyOptions, VoiceBasedChannel } from 'discord.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Config } from '../../global/Config';
import { Devmode } from '../../global/Devmode';
import { Loggers } from '../../global/Loggers';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import { DiscTimeoutError, MusicDisc } from '../MusicDisc';
import { makeNowPlayingEmbed } from './EmbedBuilders';
import {
    ConnectionError,
    ConnectionPermissionError,
    ConnectionTimeoutError,
    ConnectionUnknownError,
    PlayerError,
    PlayerResourceError,
    PlayerTimeoutError,
} from './Errors';
import {
    ActiveJukeboxStatus,
    IdleJukeboxStatus,
    InactiveJukeboxStatus,
    JukeboxEvents,
    JukeboxProps,
    JukeboxStatus,
    StatusTiers,
} from './types';

export class Jukebox {
    /** The interaction that initially created this instance. */
    private readonly _startingInteraction: JukebotInteraction;

    /** Voice channel for the bot to join. */
    private _targetVoiceChannel: VoiceBasedChannel;

    public readonly events: TypedEmitter<JukeboxEvents> = new TypedEmitter();

    private _status: JukeboxStatus;

    /** Time of last status change. */
    private _lastStatusChange: number = Date.now();

    /** Queue of songs, this will **not** include the currently playing song. */
    public inventory: MusicDisc[] = [];

    public constructor(props: JukeboxProps) {
        this._startingInteraction = props.interaction;

        this._targetVoiceChannel = props.voiceChannel;

        this._status = {
            tier: StatusTiers.Inactive,
            leaveTimeout: Config.timeoutThresholds.clearQueue
                ? setTimeout(() => this.destroy(), Config.timeoutThresholds.clearQueue * 1000)
                : null,
        };
    }

    private makeInactive(): void {
        if (this._status.tier === StatusTiers.Inactive) {
            Loggers.warn.log(`[${this._startingInteraction.guild.name}] Transitioning from inactive to inactive`);
            return;
        }

        if (this._status.leaveTimeout) {
            clearTimeout(this._status.leaveTimeout);
        }

        const leaveTimeout = Config.timeoutThresholds.clearQueue
            ? setTimeout(() => this.destroy(), Config.timeoutThresholds.clearQueue * 1000)
            : null;

        this.destroyPlayer(this._status.player);
        this.destroyConnection(this._status.connection);

        const newStatus: InactiveJukeboxStatus = {
            tier: StatusTiers.Inactive,
            leaveTimeout,
        };

        this.events.emit(`stateChange`, this._status, newStatus);
        this._lastStatusChange = Date.now();

        this._status = newStatus;
    }

    /**
     * Handles transitioning from an active state to an idle one.
     *
     * @throws Throws an error if called while in an inactive state,
     * as inactive states can only transition into active ones.
     */
    private makeIdle(): void {
        if (this._status.tier === StatusTiers.Inactive) {
            throw new Error(`Cannot transition from inactive to idle`);
        }

        if (this._status.tier === StatusTiers.Idle) {
            Loggers.warn.log(`[${this._startingInteraction.guild.name}] Transitioning from idle to idle`);
            return;
        }

        const leaveTimeout = Config.timeoutThresholds.leaveVoice
            ? setTimeout(() => this.disconnectDueToInactivity(), Config.timeoutThresholds.leaveVoice * 1000)
            : null;

        const newStatus: IdleJukeboxStatus = {
            tier: StatusTiers.Idle,
            leaveTimeout,
            connection: this._status.connection,
            player: this._status.player,
            channel: this._status.channel,
            wasPlaying: this._status.playing,
            for: Date.now() - this._status.playingSince,
        };

        this.events.emit(`stateChange`, this._status, newStatus);
        this._lastStatusChange = Date.now();

        this._status = newStatus;
    }

    /**
     * Handles transitioning from an idle or inactive state to an active one.
     * @param {MusicDisc} playing The {@link MusicDisc} that is now playing.
     * @param {VoiceConnection} connection The current voice channel {@link VoiceConnection connection}.
     * @param {AudioPlayer} player The {@link AudioPlayer player} that is handling playback.
     */
    private makeActive(playing: MusicDisc, connection: VoiceConnection, player: AudioPlayer): void {
        if (this._status.leaveTimeout) {
            clearTimeout(this._status.leaveTimeout);
        }

        if (this._status.tier === StatusTiers.Active) {
            Loggers.warn.log(`[${this._startingInteraction.guild.name}] Transitioning from active to active`);
            return;
        }

        const newStatus: ActiveJukeboxStatus = {
            tier: StatusTiers.Active,
            playing,
            playingSince: Date.now(),
            connection,
            player,
            channel: this._targetVoiceChannel,
        };

        // items are the same, so must be resuming playback
        if (this._status.tier === StatusTiers.Idle && this._status.wasPlaying === playing) {
            newStatus.playingSince -= this._status.for;
        }

        if (playing === this.inventory.at(0)) {
            this.inventory.shift();
        }

        this.events.emit(`stateChange`, this._status, newStatus);
        this._lastStatusChange = Date.now();

        this._status = newStatus;
    }

    /**
     * After a {@link Config.timeoutThresholds.leaveVoice certain amount} of inactivity,
     * this method will make the bot leave the voice chat and start the inactivity timer.
     */
    private disconnectDueToInactivity(): void {
        if (this._status.tier !== StatusTiers.Idle) {
            this.logError(`Disconnect timeout got called despite not being idle, this should never happen`);
            return;
        }

        try {
            this._startingInteraction.channel.send({ content: `Left voice channel due to inactivity` });
        } catch (error) {
            this.logError(`Error while sending "left due to inactivity" message`, { error });
        }

        this.makeInactive();
    }

    /** Removes all listeners and stops the audio player. */
    private destroyPlayer(player: AudioPlayer): void {
        try {
            player.removeAllListeners();
            player.stop();
        } catch (error) {
            this.logError(`Error trying to destroy player`, { error });
        }
    }

    /**
     * Tells the audio player to start playing the resource in the {@link Config.timeoutThresholds.play specified time}.
     *
     * @throws Throws a {@link PlayerError} error if the player does not start playing in the configured amount of time,
     * or if another unknown error happens while attempting to begin playback.
     */
    private async playInTime(
        player: AudioPlayer,
        resource: AudioResource<MusicDisc>,
        connection: VoiceConnection,
    ): Promise<void> {
        player.once(AudioPlayerStatus.Playing, () => {
            this.makeActive(resource.metadata, connection, player);
        });

        player.on(AudioPlayerStatus.AutoPaused, () => {
            if (this._status.tier === StatusTiers.Active) this.makeIdle();
            player.once(AudioPlayerStatus.Playing, () => {
                this.makeActive(resource.metadata, connection, player);
                if (!Jukebox.getHasListenersInVoice(this._targetVoiceChannel)) {
                    this.pauseDueToNoListeners(player, true);
                }
            });
        });

        try {
            player.play(resource);
        } catch (error) {
            player.removeAllListeners();
            if (error instanceof Error) {
                this.logError(`Known resource error`, { error, disc: resource.metadata.toJSON() });
            } else {
                this.logError(`Unknown resource error`, { error, disc: resource.metadata.toJSON() });
            }
            throw new PlayerResourceError(error, resource);
        } finally {
            // this still executes despite the control flow statement ("throw")
            // in the above catch block
            // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch#the_finally-block
            resource.metadata.unprepare();
        }

        if (Config.timeoutThresholds.play) {
            try {
                await entersState(player, AudioPlayerStatus.Playing, Config.timeoutThresholds.play * 1000);
            } catch (error) {
                player.off(AudioPlayerStatus.Playing, () => {
                    this.makeActive(resource.metadata, connection, player);
                });
                throw new PlayerTimeoutError(resource.metadata);
            }
        } else {
            await new Promise<void>((resolve) => {
                player.once(AudioPlayerStatus.Playing, () => resolve());
            });
        }
    }

    /**
     * Creates an {@link AudioPlayer} and attempts to start playback within the
     * {@link Config.timeoutThresholds.play configured time}.
     *
     * - Error logging is done internally.
     * - Event listeners and state managers are added internally.
     *
     * @param {VoiceConnection} connection The connection that should subscribe to this player.
     * @param {MusicDisc} disc The MusicDisc, ideally with it's resource generated.
     *
     * @throws Throws an {@link PlayerError} for many reasons:
     * - Unable to start playing within the configured time.
     * - Unable to generate resource within the configured time (if not already generated).
     * - Subscribing fails.
     * - Playback fails.
     * - Generation fails.
     */
    private async makePlayer(connection: VoiceConnection, disc: MusicDisc): Promise<AudioPlayer> {
        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
        const resource = await disc.prepare();

        player.once(`error`, (error) => {
            this.logError(`Player error`, { error });
            this._startingInteraction.channel.send({ content: `Player error occurred` }).catch(() => null);
            this.destroy();
        });

        player.on(AudioPlayerStatus.Paused, () => {
            if (this._status.tier === StatusTiers.Active) this.makeIdle();
        });

        player.on(AudioPlayerStatus.Idle, () => {
            if (this._status.tier === StatusTiers.Active) this.makeIdle();
            else if (this._status.tier === StatusTiers.Inactive) {
                this.logError(`Impossible state, player went idle but Jukebox is inactive`);
            }
            this.playNextInQueue();
        });

        if (Devmode) {
            player.on<`stateChange`>(`stateChange`, (oldS, newS) => {
                if (oldS.status === newS.status) return;
                console.log(`player: ${oldS.status} => ${newS.status}`);
            });
        }

        if (connection.subscribe(player) === undefined) {
            this.logError(`Unable to create subscription`);
            throw new Error(`Unable to create subscription`);
        }

        await this.playInTime(player, resource, connection);
        return player;
    }

    /**
     * Attempts to play the next item in the queue. If something is currently playing it will kill it.
     *
     * Will not implicitly do any state transitions since those should be handled by audio player event listeners.
     */
    public async playNextInQueue(interaction?: JukebotInteraction): Promise<InteractionReplyOptions> {
        const nextItem = this.inventory.shift();
        if (nextItem === undefined) {
            if (this._status.tier === StatusTiers.Active) this._status.player.stop();
            return { content: `The queue has finished` };
        }

        let resource: AudioResource<MusicDisc> | undefined = undefined;

        if (this._status.tier === StatusTiers.Inactive) {
            // currently in an inactive state, so no connection or player
            let connection: VoiceConnection | undefined = undefined;

            // connect & create resource
            try {
                interaction?.editReply({ content: `Connecting and preparing audio...` });
                [connection, resource] = await Promise.all([this.makeConnection(), nextItem.prepare()]);
            } catch (error) {
                // if something errors here, we want to dispose of our attempted connection and generated resource
                // since they won't get assigned to `this._status` until we call the `makePlayer()` method,
                // meaning they won't be cleaned up automatically
                if (connection) this.destroyConnection(connection);
                if (resource) nextItem.unprepare();
                if (error instanceof DiscTimeoutError || error instanceof ConnectionError) {
                    return { content: error.toString() };
                }

                this.logError(`Unknown error from ${this.playNextInQueue.name} (make connection & create resource)`, {
                    error,
                    disc: nextItem.toJSON(),
                });

                return {
                    content: `Unknown error occurred while connecting to <#${this._targetVoiceChannel.id}> and preparing audio`,
                };
            }

            // play resource
            try {
                interaction?.editReply({ content: `Playing...` });
                await this.makePlayer(connection, nextItem);
            } catch (error) {
                if (error instanceof PlayerError) {
                    return { content: error.toString() };
                }
                this.logError(`Unknown error from ${this.playNextInQueue.name} (play resource)`, {
                    error,
                    disc: nextItem.toJSON(),
                });
                return { content: `Unknown error occurred while trying to start playback` };
            }
        } else {
            // currently in an idle or active state, so we have a pre-existing connection and player

            // prepare the resource
            try {
                interaction?.editReply({ content: `Preparing audio...` });
                resource = await nextItem.prepare();
            } catch (error) {
                if (!(error instanceof DiscTimeoutError)) {
                    // the only error we expect is "unable to generate resource in time"
                    this.logError(`Unknown error from ${this.playNextInQueue.name} step 1 (prepare resource)`, {
                        error,
                        disc: nextItem.toJSON(),
                    });
                }
                return this.playNextInQueue();
                // TODO: compound embed messages, "skipped X due to error" + "now playing X"
            }

            // play the resource
            try {
                interaction?.editReply({ content: `Playing...` });
                if (this._status.tier === StatusTiers.Active) this.makeIdle();
                await this.playInTime(this._status.player, resource, this._status.connection);
            } catch (error) {
                if (error instanceof PlayerError) {
                    return this.playNextInQueue();
                    // TODO: compound embed messages, "skipped X due to error" + "now playing X"
                }
                this.logError(`Unknown error from ${this.playNextInQueue.name} (play resource)`, {
                    error,
                    disc: nextItem.toJSON(),
                });
                return { content: `Unknown error occurred while trying to start playback` };
            }
        }

        // we know status will be active since either branch of the previous `if` statement
        // called `this.playInTime()` or `this.makePlayer()` successfully,
        // both of which change the status to active on success
        const newStatus = this._status as ActiveJukeboxStatus;

        if (Jukebox.getHasListenersInVoice(this._targetVoiceChannel)) {
            return { content: makeNowPlayingEmbed(newStatus) };
        } else {
            return await this.pauseDueToNoListeners(newStatus.player, false);
        }

        // we know status will be active due to the call to `this.playInTime()`
    }

    /** Removes all listeners and destroys the connection. */
    private destroyConnection(connection: VoiceConnection): void {
        try {
            connection.removeAllListeners();
            connection.destroy();
        } catch (error) {
            this.logError(`Error trying to destroy connection`, { error });
        }
    }

    /**
     * Attempts to create a {@link VoiceConnection} connection to the
     * {@link Jukebox._targetVoiceChannel target voice channel} within the
     * {@link Config.timeoutThresholds.connect configured time}.
     *
     * - Error logging is done internally.
     * - Event listeners and state managers are added internally.
     *
     * @throws Throws a {@link ConnectionError ConnectionError} error if:
     * - Unable to connect within the configured time.
     * - Jukebot is lacking permission to join the target voice channel.
     * - The connection otherwise cannot be made.
     */
    private async makeConnection(): Promise<VoiceConnection> {
        let connection: VoiceConnection | undefined = undefined;

        // if already connected to target voice channel
        if (this._status.tier !== StatusTiers.Inactive && this._status.channel === this._targetVoiceChannel) {
            const previousConnection = this._status.connection;

            switch (previousConnection.state.status) {
                case VoiceConnectionStatus.Connecting:
                    // already attempting to make connection, so can reuse
                    connection = previousConnection;
                    break;
                case VoiceConnectionStatus.Destroyed:
                    // connection unusable, so continue with rest of method
                    break;
                case VoiceConnectionStatus.Disconnected:
                    // connection reusable, start rejoin process
                    if (previousConnection.rejoin()) {
                        connection = previousConnection;
                    } else {
                        this.logError(`Have disconnected connection but unable to rejoin`);
                        break;
                    }
                    break;
                case VoiceConnectionStatus.Ready:
                    // connection exists already, no need to continue
                    // with rest of method
                    return previousConnection;
                case VoiceConnectionStatus.Signalling:
                    // changing state, but not necessarily to a ready one
                    // so assume its being destroyed, meaning not reusable
                    break;
            }
        }

        if (connection === undefined) {
            if (!this._targetVoiceChannel.joinable) {
                throw new ConnectionPermissionError(this._targetVoiceChannel);
            }

            connection = joinVoiceChannel({
                channelId: this._targetVoiceChannel.id,
                guildId: this._targetVoiceChannel.guildId,
                adapterCreator: this._targetVoiceChannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
                selfDeaf: true,
            });
        }

        connection.once(`error`, (error) => {
            this._startingInteraction.channel.send({
                content: new ConnectionUnknownError(this._targetVoiceChannel).toString(),
            });
            this.logError(`Connection error`, { error });
            this.destroy();
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            if (this._status.tier === StatusTiers.Active) this.makeIdle();
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            if (this._status.tier !== StatusTiers.Inactive) this.makeInactive();
        });

        if (Devmode) {
            connection.on<`stateChange`>(`stateChange`, (oldS, newS) => {
                if (oldS.status === newS.status) return;
                console.log(`connection: ${oldS.status} => ${newS.status}`);
            });
        }

        if (Config.timeoutThresholds.connect) {
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, Config.timeoutThresholds.connect * 1000);
            } catch (error) {
                throw new ConnectionTimeoutError(this._targetVoiceChannel);
            }
        } else {
            try {
                await new Promise<void>((resolve) => {
                    connection!.once(VoiceConnectionStatus.Ready, () => resolve());
                });
            } catch (error) {
                this.logError(
                    `Got possible undefined connection while awaiting connect promise in ${this.makeConnection.name}`,
                    { error },
                );
                throw new ConnectionUnknownError(this._targetVoiceChannel);
            }
        }

        return connection;
    }

    /** Handles the bot being dragged into another voice channel. */
    public handleChannelDrag(newChannel: VoiceBasedChannel): void {
        this._targetVoiceChannel = newChannel;
        // we don't need to do anything else, since the connection will rejoin
        // and the player will start playing again automatically
    }

    public handleListenerLeave(): void {
        if (this._status.tier !== StatusTiers.Active) return;
        if (!Jukebox.getHasListenersInVoice(this._targetVoiceChannel)) {
            this.pauseDueToNoListeners(this._status.player, true);
        }
    }

    private async pauseDueToNoListeners(player: AudioPlayer, announce: true): Promise<void>;
    private async pauseDueToNoListeners(player: AudioPlayer, announce: false): Promise<InteractionReplyOptions>;
    private async pauseDueToNoListeners(
        player: AudioPlayer,
        announce: boolean,
    ): Promise<InteractionReplyOptions | void> {
        if (player.pause(false)) {
            try {
                if (announce) {
                    await this._startingInteraction.channel.send({ content: `Paused due to nobody listening` });
                    return;
                }
                return { content: `Paused due to nobody listening` };
            } catch (error) {
                this.logError(`Error sending "paused due to to nobody listening" message`, {
                    error,
                    startingInteractionChannel: {
                        id: this._startingInteraction.channel.id,
                        name: this._startingInteraction.channel.name,
                    },
                });
            }
        } else {
            this.logError(`Unable to pause after drag into non-listener vc`, {
                channel: { id: this._targetVoiceChannel.id, name: this._targetVoiceChannel.name },
            });
        }
    }

    /** Irreversibly destroys this instance. */
    public destroy(): void {
        if (this._status.leaveTimeout) clearTimeout(this._status.leaveTimeout);

        if (this._status.tier !== StatusTiers.Inactive) {
            this.destroyPlayer(this._status.player);
            this.destroyConnection(this._status.connection);
        }

        this.events.emit(`destroyed`, this);
    }

    public logError(message: string, props?: { error?: unknown; [k: string]: unknown }) {
        Loggers.error.log(`[${this._startingInteraction.guild.name}] ${message}`, {
            ...props,
            vc: { name: this._targetVoiceChannel.name, id: this._targetVoiceChannel.id },
            guildId: this._startingInteraction.guildId,
        });
    }

    public get status() {
        return this._status;
    }

    public get isFull(): boolean {
        return this.inventory.length >= Config.maxQueueSize;
    }

    /** Maximum number of {@link MusicDisc}'s that can be added to the queue, undefined being no limit. */
    public get freeSpace(): number | undefined {
        if (Config.maxQueueSize) {
            return Config.maxQueueSize - this.inventory.length;
        }
        return undefined;
    }

    public get lastStatusChange(): number {
        return this._lastStatusChange;
    }

    public get voiceChannel(): VoiceBasedChannel {
        return this._targetVoiceChannel;
    }

    private static getHasListenersInVoice(voiceChannel: VoiceBasedChannel): boolean {
        return voiceChannel.members.some(
            (e) => !e.user.bot && e.voice.selfDeaf !== true && e.voice.serverDeaf !== true,
        );
    }
}
