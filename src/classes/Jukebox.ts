import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
    createAudioPlayer,
    joinVoiceChannel,
} from '@discordjs/voice';
import dayjs, { extend } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    InteractionReplyOptions,
    TextBasedChannel,
    VoiceBasedChannel,
    channelMention,
    userMention,
} from 'discord.js';
import { JukebotGlobals } from '../global';
import { timeoutMessage } from '../messages';
import { Colours, JukeboxState, JukeboxStateActive } from '../types';
import { TimeoutError, capitalize, connectionEntersState, playerEntersState, withPossiblePlural } from '../util';
import { Hopper } from './Hopper';
import { MusicDisc } from './MusicDisc';

extend(relativeTime);

export class Jukebox {
    private static readonly _icon =
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/e/ee/Jukebox_JE2_BE2.png/revision/latest';

    public readonly upcomingQueue: Hopper = new Hopper(JukebotGlobals.config.maxQueueSize);

    public readonly historyQueue: Hopper = new Hopper(JukebotGlobals.config.previousQueueSize);

    /** Text channel to send messages in. */
    public readonly textChannel: TextBasedChannel;

    /** Voice channel to play audio in. */
    private _voiceChannel: VoiceBasedChannel;

    private readonly _onDestroy: (guildId: string) => void;

    private _connection!: VoiceConnection;

    private _player!: AudioPlayer;

    private _state!: JukeboxState;

    public get targetVoiceChannel(): VoiceBasedChannel {
        return this._voiceChannel;
    }

    public get state(): JukeboxState {
        return this._state;
    }

    public constructor(
        channel: TextBasedChannel,
        targetVoiceChannel: VoiceBasedChannel,
        onDestroy: (guildId: string) => void,
    ) {
        this.textChannel = channel;
        this._voiceChannel = targetVoiceChannel;
        this._onDestroy = onDestroy;

        this.createConnection();
        this.createPlayer();
        this.createIdleState();
    }

    private cleanupConnection(): void {
        this._connection.removeAllListeners();
        if (this._connection.state.status !== VoiceConnectionStatus.Destroyed) this._connection.destroy();
    }

    private cleanupPlayer(): void {
        this._player.removeAllListeners();
        if (this._player.state.status !== AudioPlayerStatus.Idle) this._player.stop();
    }

    private createIdleState(): void {
        if (this._state?.status === 'idle') clearTimeout(this._state.timeout);

        if (JukebotGlobals.devmode) console.log('[Jukebox:State]: Now idle');

        this._state = {
            status: 'idle',
            setAt: Date.now(),
            timeout:
                JukebotGlobals.config.timeoutThresholds.inactivity === Infinity
                    ? undefined
                    : setTimeout(() => {
                          this.textChannel.send({ content: 'Left due to inactivity' }).catch(this.logError);
                          this.destroyInstance();
                      }, JukebotGlobals.config.timeoutThresholds.inactivity * 1_000),
            wasPlaying:
                this._state?.status === 'active'
                    ? {
                          item: this._state.currentlyPlaying,
                          for: Date.now() - this._state.playingSince,
                      }
                    : undefined,
        };
    }

    private createActiveState(currentlyPlaying: MusicDisc, createEmbed: boolean): void {
        let playingPreviouslyFor = 0;

        if (this._state?.status === 'idle') {
            clearTimeout(this._state.timeout);
            playingPreviouslyFor = this._state.wasPlaying?.for ?? 0;
        }

        if (JukebotGlobals.devmode) console.log('[Jukebox:State]: Now active');

        this._state = {
            status: 'active',
            playingSince: Date.now() - playingPreviouslyFor,
            currentlyPlaying,
        };

        if (createEmbed) {
            this.textChannel.send({ embeds: [this.makeImmediateNowPlayingEmbed(this._state)] }).catch(this.logError);
        }
    }

    /** Returns whether there are non-bot non-deafened users in the target voice channel. */
    public hasAudioListeners(): boolean {
        return this._voiceChannel.members.some(({ user, voice }) => !user.bot && !voice.selfDeaf && !voice.serverDeaf);
    }

    public pauseDueToNoListeners(): void {
        this._player.pause();
        this.textChannel
            .send({ content: `Paused due to no listeners in ${channelMention(this._voiceChannel.id)}` })
            .catch(this.logError);
    }

    /** Creates a connection to the target voice channel, does not ensure the connection becomes ready. */
    private createConnection(): void {
        if (this._connection !== undefined) this.cleanupConnection();

        this._connection = joinVoiceChannel({
            channelId: this._voiceChannel.id,
            guildId: this._voiceChannel.guild.id,
            adapterCreator: this._voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        this._connection.on('error', (error) => {
            this.logError(error);
            this.destroyInstance();
        });

        if (JukebotGlobals.devmode) {
            this._connection.on('stateChange', (oldState, newState) => {
                if (oldState.status === newState.status) return;

                console.log(
                    `[Jukebox:${Colours.FgCyan}VoiceConnection${Colours.Reset}] ${capitalize(
                        oldState.status,
                    )} -> ${capitalize(newState.status)}`,
                );
            });
        }

        if (this._player !== undefined) this._connection.subscribe(this._player);
    }

    /** Creates a player to the target connection, does not ensure the player becomes idle. */
    private createPlayer(): void {
        if (this._player !== undefined) this.cleanupPlayer();

        this._player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

        this._player.on('error', (error) => {
            this.logError(error);
            this.destroyInstance();
        });

        if (JukebotGlobals.devmode) {
            this._player.on('stateChange', (oldState, newState) => {
                if (oldState.status === newState.status) return;

                console.log(
                    `[Jukebox:${Colours.FgMagenta}AudioPlayer${Colours.Reset}] ${capitalize(
                        oldState.status,
                    )} -> ${capitalize(newState.status)}`,
                );
            });
        }

        this._player.on(AudioPlayerStatus.AutoPaused, () => this.createIdleState());
        this._player.on(AudioPlayerStatus.Paused, () => this.createIdleState());
        this._player.on(AudioPlayerStatus.Idle, () => this.playNextInQueue());
        this._player.on(AudioPlayerStatus.Playing, () => {
            if (!this.hasAudioListeners()) this.pauseDueToNoListeners();
            else if (this._state.status === 'idle' && this._state.wasPlaying !== undefined) {
                this.createActiveState(this._state.wasPlaying.item, false);
            }
        });

        this._connection.subscribe(this._player);
    }

    public async ensureConnectionReady(): Promise<void> {
        return void (await connectionEntersState(this._connection, VoiceConnectionStatus.Ready));
    }

    public handleChannelDrag(newVoiceChannel: VoiceBasedChannel): void {
        this._voiceChannel = newVoiceChannel;
    }

    public pause(): boolean {
        return this._player.pause(true);
    }

    public unpause(): boolean {
        return this._player.unpause();
    }

    /**
     * Attempts to play the next song in the queue (if it exists).
     *
     * @param {ChatInputCommandInteraction} [requester] An interaction to edit state updates onto, this interaction
     * should already have been replied to.
     * @returns {Promise<JukeboxState>} The new state of the Jukebox.
     */
    public async playNextInQueue(requester?: ChatInputCommandInteraction): Promise<JukeboxState> {
        const logToRequesterOrChannel: (content: string) => void =
            requester === undefined
                ? (content) => this.textChannel.send({ content }).catch(this.logError)
                : (content) => requester.editReply({ content }).catch(this.logError);

        if (JukebotGlobals.devmode) console.log(`[Jukebox] Playing next in queue (${this.upcomingQueue.getSize()})`);

        const nextItem = this.upcomingQueue.getNext();

        if (nextItem === undefined) {
            this.createIdleState();
            return this._state;
        }

        if (this.historyQueue.isFull()) this.historyQueue.removeItems(0, 1);
        this.historyQueue.addItems([nextItem]);

        let resource: AudioResource<MusicDisc>;

        // connecting
        if (this._connection.state.status !== VoiceConnectionStatus.Ready) {
            requester
                ?.editReply({ content: `Connecting to ${channelMention(this._voiceChannel.id)}` })
                .catch(this.logError);

            try {
                await connectionEntersState(this._connection, VoiceConnectionStatus.Ready);
            } catch (error) {
                if (error instanceof TimeoutError) logToRequesterOrChannel(timeoutMessage.connect(this._voiceChannel));
                else this.logError(error);

                this.createIdleState();
                return this._state;
            }
        }

        // preparing
        if (!nextItem.hasResource()) {
            requester?.editReply({ content: 'Preparing audio...' }).catch(this.logError);
            try {
                resource = await nextItem.getResource();
            } catch (error) {
                if (error instanceof TimeoutError) logToRequesterOrChannel(timeoutMessage.generateResource(nextItem));
                else this.logError(error);

                return await this.playNextInQueue(requester);
            }
        } else resource = await nextItem.getResource();

        // playing
        requester?.editReply({ content: 'Playing...' }).catch(this.logError);
        try {
            this._player.play(resource);

            await playerEntersState(this._player, AudioPlayerStatus.Playing);
        } catch (error) {
            if (error instanceof TimeoutError) logToRequesterOrChannel(timeoutMessage.play);
            else this.logError(error);

            this._player.stop();

            return await this.playNextInQueue(requester);
        }

        this.createActiveState(nextItem, true);

        return this._state;
    }

    /** Cleans up the player and connection, and executes the `onDestroy` callback function. */
    public destroyInstance(): void {
        if (JukebotGlobals.devmode) console.log('[Jukebox] Instance destroyed');
        this._onDestroy(this._voiceChannel.guild.id);
        this.cleanupPlayer();
        this.cleanupConnection();
    }

    /** Adds current song elapsed/time left information to a field of an embed. */
    public addCurrentSongDurationToEmbed(embed: EmbedBuilder): void {
        if (this._state.status !== 'active') return;

        const totalDuration = this._state.currentlyPlaying.durationSeconds;

        const elapsed = this.getSecondsElapsedInCurrentSong();
        const remaining = this.getSecondsLeftInCurrentSong();
        const percentage = Math.floor((100 * elapsed) / totalDuration);

        embed.addFields({
            name: `Time Elapsed (${percentage}%)`,
            value: `${Hopper.formatDuration(elapsed)} (${Hopper.formatDuration(remaining)} left)`,
        });
    }

    public getSecondsElapsedInCurrentSong(): number {
        if (this._state.status !== 'active') return 0;

        return Math.floor((Date.now() - this._state.playingSince) / 1_000);
    }

    public getSecondsLeftInCurrentSong(): number {
        if (this._state.status !== 'active') return 0;

        const playingFor = Math.floor((Date.now() - this._state.playingSince) / 1_000);
        const playingLeft = this._state.currentlyPlaying.durationSeconds - playingFor;
        return playingLeft;
    }

    private makeImmediateNowPlayingEmbed(state: JukeboxStateActive): EmbedBuilder {
        const { currentlyPlaying } = state;

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Now Playing', iconURL: Jukebox._icon })
            .addFields({
                name: 'Requested By',
                value: `${userMention(currentlyPlaying.requestedById)} ${dayjs(
                    currentlyPlaying.requestedAt,
                ).fromNow()}`,
            })
            .setColor(JukebotGlobals.config.embedColour);

        this.upcomingQueue.addQueueInformationToEmbed(embed);

        currentlyPlaying.makeFullDescription(embed);

        return embed;
    }

    public makeNowPlayingEmbed(state: JukeboxStateActive): EmbedBuilder {
        const embed = this.makeImmediateNowPlayingEmbed(state);

        this.addCurrentSongDurationToEmbed(embed);

        return embed;
    }

    /**
     * (If in devmode or receiving an unknown object) Logs an error to the console.
     *
     * (Otherwise) Attempts to send an error message in the text channel of this Jukebox instance.
     */
    private async logError(error: unknown): Promise<void> {
        if (!(error instanceof Error) || JukebotGlobals.devmode) {
            console.log(error);
            return;
        }

        try {
            await this.textChannel.send({ content: `Error: ${error.message}` });
        } catch (anotherError) {
            // an error occurred trying to follow up the interaction
            // this is likely due to the interaction being deleted
            // in any case we don't want to try informing the user of the error again
            // since it will most likely result in another error
        }
    }

    public toString(): InteractionReplyOptions {
        const outputEmbeds: EmbedBuilder[] = [];

        const output: string[] = [
            `Jukebox(${this._voiceChannel.guild.name})`,
            `Connection(${channelMention(this._voiceChannel.id)}): ${capitalize(this._connection.state.status)}`,
            `Player: ${capitalize(this._player.state.status)}`,
        ];

        if (this._state.status === 'active') {
            const playingFor = Math.floor((Date.now() - this._state.playingSince) / 1_000);

            output.push(`State: Active (${withPossiblePlural(playingFor)})`);
            outputEmbeds.push(this.makeNowPlayingEmbed(this._state));
        } else {
            const inactiveTimeRemaining =
                JukebotGlobals.config.timeoutThresholds.inactivity -
                Math.floor((Date.now() - this._state.setAt) / 1_000);

            output.push(`State: Inactive (${withPossiblePlural(inactiveTimeRemaining)} left)`);
        }

        return {
            content: output.join('\n'),
            embeds: outputEmbeds,
        };
    }
}
