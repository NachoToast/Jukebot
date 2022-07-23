import {
    AudioPlayer,
    createAudioPlayer,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
    joinVoiceChannel,
    DiscordGatewayAdapterCreator,
    entersState,
    AudioResource,
    AudioPlayerStatus,
} from '@discordjs/voice';
import { InteractionReplyOptions, VoiceBasedChannel } from 'discord.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Config } from '../../global/Config';
import { Loggers } from '../../global/Loggers';
import { Messages } from '../../global/Messages';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import { ValidSearch } from '../../types/SearchTypes';
import { Hopper } from '../Hopper';
import { HopperProps, HopperResult } from '../Hopper/types';
import { MusicDisc } from '../MusicDisc';
import {
    JukeboxEvents,
    JukeboxStatus,
    JukeboxProps,
    StatusTiers,
    InactiveJukeboxStatus,
    IdleJukeboxStatus,
    ActiveJukeboxStatus,
} from './types';

/** Manages playback and queueing of music for a single guild. */
export class Jukebox {
    /** The interaction that created this instance. */
    private readonly _startingInteraction: JukebotInteraction;

    /** Voice channel the bot is currently in, or aiming to be in. */
    private readonly _targetVoiceChannel: VoiceBasedChannel;

    public readonly events: TypedEmitter<JukeboxEvents> = new TypedEmitter();

    private _status: JukeboxStatus;

    /** Queue of MusicDiscs. */
    private _inventory: MusicDisc[] = [];

    /**
     * Whether this is currently in the process of beginning to play something,
     * i.e. waiting for a resource.
     *
     * Use the {@link JukeboxEvents.noLongerPlayLocked noLongerPlayLocked} event on a Jukebox's
     * {@link Jukebox.events event emitter} to listen for when playlock has ended.
     *
     * @throws Throws an error if the given voice channel cannot be joined by the bot.
     */
    private _playLock = false;

    public constructor(props: JukeboxProps) {
        this._startingInteraction = props.interaction;

        if (props.voiceChannel.joinable === false)
            throw new Error(Messages.cannotJoinThisChannel(props.voiceChannel.id));

        this._targetVoiceChannel = props.voiceChannel;

        this._status = {
            tier: StatusTiers.Inactive,
            leaveTimeout: Config.timeoutThresholds.clearQueue
                ? setTimeout(() => this.destroy(), Config.timeoutThresholds.clearQueue * 1000)
                : null,
        };
    }

    private destroyPlayer(player: AudioPlayer): void {
        try {
            player.off(`error`, (error) => {
                this.logError(`Player error`, { error });
                this.destroy();
            });

            console.log(
                `Removing player, unremoved listener count:`,
                player.listenerCount(`debug`) +
                    player.listenerCount(`error`) +
                    player.listenerCount(`stateChange`) +
                    player.listenerCount(`subscribe`) +
                    player.listenerCount(`unsubscribe`),
            );

            player.stop();
        } catch (error) {
            this.logError(`Error trying to destroy player`, { error });
        }
    }

    /**
     * Creates an {@link AudioPlayer} and attempts to get it to start playing within the
     * {@link Config.timeoutThresholds.play configured} time.
     * @param {VoiceConnection} connection The connection that should subscribe to this player.
     * @param {AudioResource<MusicDisc>} resource The resource to play.
     *
     * @throws Throws an error if unable to start playing within the configured time,
     * or if subscribing or playback fails.
     */
    private async makePlayer(connection: VoiceConnection, resource: AudioResource<MusicDisc>): Promise<AudioPlayer> {
        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

        player.once(`error`, (error) => {
            this.logError(`Player error`, { error });
            this.destroy();
        });

        if (connection.subscribe(player) === undefined) {
            this.logError(`Unable to create subscription`);
            throw new Error(`Unable to create subscription`);
        }

        try {
            player.play(resource);
        } catch (error) {
            this.logError(`Unable to play resource`, { error, resource });
            throw new Error(`Unable to play resource`);
        } finally {
            // this still executes despite the control flow statement ("throw")
            // in the above catch block
            // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch#the_finally-block
            resource.metadata.unprepare();
        }

        if (Config.timeoutThresholds.play) {
            try {
                await entersState(player, AudioPlayerStatus.Playing, Config.timeoutThresholds.play * 1000);
                return player;
            } catch (error) {
                throw new Error(Messages.timeout(Config.timeoutThresholds.play, `start playing`));
            }
        }

        return await new Promise<AudioPlayer>((resolve) => {
            player.once(AudioPlayerStatus.Playing, () => resolve(player));
        });
    }

    private destroyConnection(connection: VoiceConnection): void {
        try {
            connection.off(`error`, (error) => {
                this.logError(`Connection error`, { error });
                this.destroy();
            });

            connection.off(VoiceConnectionStatus.Destroyed, () => {
                this._status = this.makeInactiveStatus();
            });

            connection.off(VoiceConnectionStatus.Disconnected, () => {
                this._status = this.makeInactiveStatus();
            });

            console.log(
                `Removing connection, unremoved listener count:`,
                connection.listenerCount(`debug`) +
                    connection.listenerCount(`error`) +
                    connection.listenerCount(`stateChange`),
            );

            connection.destroy();
        } catch (error) {
            this.logError(`Error trying to destroy connection`, { error });
        }
    }

    /**
     * Attempts to connect to the {@link Jukebox._targetVoiceChannel target voice channel} in the
     * {@link Config.timeoutThresholds.connect configured} amount of time.
     *
     * @throws Throws an error if the connection cannot be made, or is not ready in the configured amount of time.
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
                    previousConnection.rejoin();
                    connection = previousConnection;
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
            connection = joinVoiceChannel({
                channelId: this._targetVoiceChannel.id,
                guildId: this._targetVoiceChannel.guildId,
                adapterCreator: this._targetVoiceChannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
                selfDeaf: true,
            });
        }

        connection.once(`error`, (error) => {
            this.logError(`Connection error`, { error });
            this.destroy();
        });

        // connection.once(VoiceConnectionStatus.Destroyed, () => {
        //     this._status = this.makeInactiveStatus();
        // });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            this._status = this.makeInactiveStatus();
        });

        if (Config.timeoutThresholds.connect) {
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, Config.timeoutThresholds.connect * 1000);
                return connection;
            } catch (error) {
                throw new Error(Messages.timeout(Config.timeoutThresholds.connect, `connect`));
            }
        }

        return await new Promise<VoiceConnection>((resolve) => {
            connection!.once(VoiceConnectionStatus.Ready, () => resolve(connection!));
        });
    }

    /**
     * Handles transitioning from an idle or active state to an inactive one.
     *
     * This also does event listener cleanup of the connection and player.
     */
    private makeInactiveStatus(): InactiveJukeboxStatus {
        if (this._status.tier === StatusTiers.Inactive) {
            Loggers.warn.log(`[${this._startingInteraction.guild.name}] Transitioning from inactive to inactive`);
            return this._status;
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

        this._status = newStatus;

        return newStatus;
    }

    /**
     * Handles transitioning from an active state to an idle one.
     *
     * @throws Throws an error if trying to transition from an inactive state,
     * because an inactive state can only transition into an active one.
     */
    private makeIdleStatus(): IdleJukeboxStatus {
        if (this._status.tier === StatusTiers.Inactive) {
            throw new Error(`Cannot transition from inactive to idle`);
        }

        if (this._status.tier === StatusTiers.Idle) {
            Loggers.warn.log(`[${this._startingInteraction.guild.name}] Transitioning from idle to idle`);
            return this._status;
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

        this._status = newStatus;

        return newStatus;
    }

    /**
     * Handles transitioning from an idle or inactive state to an active one.
     * @param {MusicDisc} playing The {@link MusicDisc} that is now playing.
     * @param {VoiceConnection} connection The current voice channel {@link VoiceConnection connection}.
     * @param {AudioPlayer} player The {@link AudioPlayer player} that is handling playback.
     */
    private makeActiveStatus(
        playing: MusicDisc,
        connection: VoiceConnection,
        player: AudioPlayer,
    ): ActiveJukeboxStatus {
        if (this._status.leaveTimeout) {
            clearTimeout(this._status.leaveTimeout);
        }

        if (this._status.tier === StatusTiers.Active) {
            Loggers.warn.log(`[${this._startingInteraction.guild.name}] Transitioning from active to active`);
            return this._status;
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

        this.events.emit(`stateChange`, this._status, newStatus);

        this._status = newStatus;

        return newStatus;
    }

    /**
     * Removes listeners, stops playblack, clears the queue, and destroys connection.
     *
     * Should only be called when the Jukebox needs to kill itself.
     *
     * All error logging should be done prior to this.
     *
     */
    public destroy(): void {
        if (this._status.leaveTimeout) clearTimeout(this._status.leaveTimeout);

        if (this._status.tier !== StatusTiers.Inactive) {
            this.destroyPlayer(this._status.player);
            this.destroyConnection(this._status.connection);
        }

        this.events.emit(`destroyed`, this);
    }

    /**
     * After a {@link Config.timeoutThresholds.leaveVoice certain amount} of inactivity,
     * this method will make the bot leave the voice chat and call the
     * {@link Jukebox.makeInactiveStatus makeInactiveStatus()} method.
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

        this.makeInactiveStatus();
    }

    /** Starts playback after being inactive, triggered by a request to add an item to the queue. */
    public async playSearchFromInactive<T extends ValidSearch>(
        search: HopperProps<T>,
        /** Interaction to live-edit response onto. */
        interaction?: JukebotInteraction,
    ): Promise<InteractionReplyOptions> {
        const jsonSearch = {
            ...search,
            interaction: { member: { id: interaction?.member.id, name: interaction?.member.displayName } },
        };

        if (this._status.tier !== StatusTiers.Inactive) {
            this.logError(`Tried to play from inactive when status is not inactive (${this._status.tier})`, {
                search: jsonSearch,
            });
            return { content: `Internal state error` };
        }

        // these are all the requirements to "reboot" the Jukebox
        let connection: VoiceConnection | undefined = undefined;
        let results: HopperResult<T>;
        let resource: AudioResource<MusicDisc> | undefined = undefined;
        let player: AudioPlayer | undefined = undefined;

        const cleanup = () => {
            if (player) this.destroyPlayer(player);
            if (connection) this.destroyConnection(connection);
            if (this._inventory.at(0)?.resource !== undefined) this._inventory[0].unprepare();
        };

        // 1. make a connection to the target voice channel and get search results (in parallel)
        try {
            const connectPromise = this.makeConnection();

            const resultsPromise = new Hopper<T>(search).fetchResults();

            const editPromise = interaction?.deferReply().catch(() => (interaction = undefined));

            [connection, results] = await Promise.all([connectPromise, resultsPromise, editPromise]);
        } catch (error) {
            cleanup();
            if (error instanceof Error) {
                return { content: error.message };
            }

            this.logError(`Unknown error occurred on playSearchFromInactive step 1 (connect & fetch results)`, {
                error,
                search: jsonSearch,
            });
            return { content: `Unknown error occurred while searching and connecting` };
        }

        // 2. make sure the search didn't have an unexpected error
        if (!results.success) {
            connection.destroy();
            this.logError(`Unknown error occurred on playSearchFromInactive step 2 (fetch results error)`, {
                error: results.error,
                search: jsonSearch,
            });
            return { content: `Unknown error occurred while searching` };
        }

        // 3. check that we actually got search results
        if (results.items.length === 0) {
            cleanup();
            // TODO: show results.errors in an embed or something
            return { content: `No results found` };
        }

        this._inventory.push(...results.items);

        // 4. now we can prepare the resource
        try {
            const resourcePromise = this._inventory[0].prepare();

            const editPromise = interaction
                ?.editReply({
                    content: `Preparing resource...`,
                })
                .catch(() => (interaction = undefined));

            [resource] = await Promise.all([resourcePromise, editPromise]);
        } catch (error) {
            cleanup();
            if (error instanceof Error) {
                return { content: error.message };
            }

            this.logError(`Unknown error occurred on playSearchFromInactive step 4 (prepare resource)`, {
                error,
                disc: this._inventory[0].toJSON(),
                search: jsonSearch,
            });
            return { content: `Unknown error occurred while preparing resource` };
        }

        // 5. now we can play the resource
        try {
            const playPromise = this.makePlayer(connection, resource);

            const editPromise = interaction
                ?.editReply({
                    content: `Playing...`,
                })
                .catch(() => (interaction = undefined));

            [player] = await Promise.all([playPromise, editPromise]);
        } catch (error) {
            cleanup();
            if (error instanceof Error) {
                return { content: error.message };
            }

            this.logError(`Unknown error occurred on playSearchFromInactive step 5 (play resource)`, {
                error,
                disc: this._inventory[0].toJSON(),
                search: jsonSearch,
            });
            return { content: `Unknown error occurred while playing` };
        }

        // 6. finally we can update the status of the Jukebox to active
        this.makeActiveStatus(this._inventory[0], connection, player);

        return {
            content: `Now playing **${this._inventory[0].title}** [${this._inventory[0].durationString}] (*requested by ${this._inventory[0].addedBy.displayName}*)`,
        };
    }

    /** Maximum number of {@link MusicDisc}'s that can be added to the queue, undefined being no limit. */
    public get freeSpace(): number | undefined {
        if (Config.maxQueueSize) {
            return Config.maxQueueSize - this._inventory.length;
        }
        return undefined;
    }

    public get isFull(): boolean {
        if (Config.maxQueueSize) {
            return this._inventory.length === Config.maxQueueSize;
        }
        return false;
    }

    private logError(message: string, props?: { error?: unknown; [k: string]: unknown }) {
        Loggers.error.log(`[${this._startingInteraction.guild.name}] ${message}`, {
            ...props,
            vc: { name: this._targetVoiceChannel.name, id: this._targetVoiceChannel.id },
            guildId: this._startingInteraction.guildId,
        });
    }
}
