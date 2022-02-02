import { FullInteraction, GuildedInteraction } from '../types/Interactions';
import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import Colours from '../types/Colours';
import { Hopper } from './Hopper';
import { CurrentlyIdle, CurrentlyPlaying, CurrentStatus, DestroyCallback, WasPlaying } from '../types/Jukebox';
import { Jukebot } from './Client';
import { MessageEmbed } from 'discord.js';
import { MusicDisc } from './MusicDisc';
import { promisify } from 'util';

const wait = promisify(setTimeout);

/** Each Jukebox instance handles audio playback for a single guild. */
export class Jukebox {
    /** The interaction that created this instance. */
    private readonly _startingInteraction: FullInteraction;
    /** The latest interaction that caused this instance to join or move to a voice channel. */
    private _latestInteraction: FullInteraction;

    /** A function to run on {@link Jukebox.cleanup cleanup}. */
    private readonly _destroyCallback: DestroyCallback;

    private _connection: VoiceConnection;
    public get connection(): VoiceConnection {
        return this._connection;
    }

    private _player: AudioPlayer;

    /** Array of to-be-played {@link MusicDisc music discs}. */
    private _inventory: MusicDisc[] = [];
    private _status: CurrentStatus = this.makeIdle();
    private _playLock = false;

    private get ready() {
        const connectionReady = this._connection.state.status === VoiceConnectionStatus.Ready;
        const playerIdle = this._player.state.status === AudioPlayerStatus.Idle;
        const itemReady = !!this._inventory.at(0);
        const notLocked = !this._playLock;

        return connectionReady && playerIdle && itemReady && notLocked;
    }

    public constructor(interaction: FullInteraction, destroyCallback: DestroyCallback) {
        this._startingInteraction = interaction;
        this._latestInteraction = interaction;
        this._destroyCallback = destroyCallback;

        this._connection = joinVoiceChannel({
            channelId: interaction.member.voice.channelId,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        this._connection.on('error', (err) => this.handleConnectionError(err));
        // this._connection.on('stateChange', (a, b) => {
        //     if (a.status === b.status) return;
        //     console.log(`connection: ${a.status} => ${b.status}`);
        // });

        this._player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

        this._player.on('error', (err) => this.handlePlayerError(err));
        this._player.on('stateChange', (a, b) => {
            if (a.status === b.status) return;
            console.log(`player: ${a.status} => ${b.status}`);
        });
        this._player.on(AudioPlayerStatus.Idle, () => void this.play(false));
        this._player.on(AudioPlayerStatus.Paused, () => void this.makeIdle());
        this._player.on(AudioPlayerStatus.AutoPaused, () => void this.makeIdle());

        this._connection.subscribe(this._player);
    }

    private handleConnectionError(error: Error): void {
        console.log(
            `[${this._latestInteraction.guild.name}] (connection) ${Colours.FgRed}error${Colours.Reset}`,
            error,
        );
        this.cleanup();
    }

    private handlePlayerError(error: Error): void {
        console.log(`[${this._latestInteraction.guild.name}] (player) ${Colours.FgRed}error${Colours.Reset}`, error);
        this.cleanup();
    }

    /** Updates the
     * {@link Jukebox._status status} property to idle.
     * Scheduling {@link Jukebox.disconnectTimeout inactivity events} to run.
     * @returns {CurrentStatus} The newly updated state.
     */
    private makeIdle(): CurrentlyIdle {
        let wasPlaying: WasPlaying | null = null;

        // optional chaining since this method is called on startup (current will be undefined),
        if (this._status?.active) {
            wasPlaying = {
                musicDisc: this._status.musicDisc,
                for: Math.floor((Date.now() - this._status.playingSince) / 1000),
            };
        }
        const newCurrent: CurrentlyIdle = {
            active: false,
            idleSince: Date.now(),
            wasPlaying,
            leaveTimeout: setTimeout(() => this.disconnectTimeout(), Jukebot.config.inactivityTimeout * 1000),
        };
        this._status = newCurrent;
        return newCurrent;
    }

    /** Updates the
     * {@link Jukebox._status status} property to active.
     * @param {MusicDisc} musicDisc - The {@link MusicDisc music disc} that is now playing.
     *
     * @returns {CurrentlyPlaying} The new playing status.
     */
    private makeActive(musicDisc: MusicDisc): CurrentlyPlaying {
        let playingSince = Date.now();

        if (!this._status.active) {
            if (this._status.wasPlaying) {
                playingSince -= this._status.wasPlaying.for * 1000;
            }
            clearTimeout(this._status.leaveTimeout);
        }

        const newCurrent: CurrentlyPlaying = {
            active: true,
            musicDisc,
            playingSince,
        };
        this._status = newCurrent;
        return newCurrent;
    }

    /** Adds an item to the {@link Jukebox._inventory queue}, and starts playing it if possible.
     * @param {GuildedInteraction} interaction - The interaction that invoked this request.
     * @param {boolean} liveEdit - Whether to make and edit a response over time,
     *  or just return one
     * once everything has completed.
     *
     * @returns {Object} A promised object containing:
     * `outputEmbed`: A {@link MessageEmbed} containing "added to queue",
     *  "now playing", or error information.
     * `success` A boolean stating whether the operation was a success.
     */
    public async add(
        interaction: GuildedInteraction,
        liveEdit: boolean,
    ): Promise<{ outputEmbed: MessageEmbed; success: boolean }> {
        const items: MusicDisc[] = [];

        try {
            const response = await Hopper.add(interaction);
            if (!response.valid) {
                response;
                // TODO: make invalid search type embed
                const outputEmbed = new MessageEmbed()
                    .setTitle('Invalid Search')
                    .setDescription(`${interaction.options.get('song')} (invalid ${response.searchType.type}`);
                if (liveEdit) {
                    await interaction.editReply({ embeds: [outputEmbed] });
                }
                return { success: false, outputEmbed };
            }
            if (!response.success) {
                throw new Error(response.errorMessages.join(','));
            }
            const { items: newItems, type } = response;
            const maxAddedItems = Jukebot.config.maxQueueSize - this._inventory.length;
            const numAdded = Math.min(newItems.length, maxAddedItems);

            items.push(...newItems.slice(0, numAdded));

            if (type !== 'single') {
                console.log(response.playlistName, response.playlistSize);
                if (response.source === 'spotify') {
                    console.log(
                        response.conversionInfo
                            .map((e) => `${e.originalName} => ${e.youtubeEquivalent} (${e.levenshtein})`)
                            .join('\n'),
                    );
                }
            }
        } catch (error) {
            // TODO: make error embed
            const outputEmbed = new MessageEmbed().setTitle('Error');
            if (error instanceof Error) {
                outputEmbed.setDescription(`${error.name}\n${error.message}`);
            } else outputEmbed.setDescription(`${error}`);

            if (liveEdit) {
                await interaction.editReply({ embeds: [outputEmbed] });
            }
            return { success: false, outputEmbed };
        }

        if (!items.length) {
            // TODO: make no results embed
            const outputEmbed = new MessageEmbed().setTitle('No Results').setDescription('No results found.');
            if (liveEdit) await interaction.editReply({ embeds: [outputEmbed] });
            return { success: false, outputEmbed };
        }
        this._inventory.push(...items);
        // console.log(meta);

        // TODO: make "added to queue" embeds for playlist and single song
        const enqueuedEmbed = new MessageEmbed().setTitle('Added To Queue');
        if (items.length > 1) {
            enqueuedEmbed.setDescription(`Added ${items.length} songs to the queue.`);
        } else {
            enqueuedEmbed.setDescription(`Added ${items[0].title}" to the queue.`);
        }

        if (!this.ready) {
            if (liveEdit) {
                await interaction.editReply({ embeds: [enqueuedEmbed] });
            }
            return { success: true, outputEmbed: enqueuedEmbed };
        }

        const { success, outputEmbed } = await this.play(true);
        if (liveEdit) {
            await interaction.editReply({ embeds: [outputEmbed] });
        }
        return { success, outputEmbed };
    }

    /** Attemts to play the next item in the queue.
     * @param {booolean} silent - Whether to send a {@link MessageEmbed messageEmbed }
     * in the output channel.
     *
     * @returns {Promise<Object>} A promised object containing:
     * - `outputEmbed` A {@link MessageEmbed} containing "now playing" or error information.
     * - `success` A boolean stating whether the operation was a success.
     */
    private async play(silent: boolean): Promise<{ outputEmbed: MessageEmbed; success: boolean }> {
        this._playLock = true;
        const nextItem = this._inventory.shift();
        if (!nextItem) {
            this.makeIdle();
            this._playLock = false;
            // TODO: make queue finished embed
            const outputEmbed = new MessageEmbed().setTitle('Queue Finished').setDescription('The queue has finished.');

            if (!silent) {
                await this._latestInteraction.channel.send({ embeds: [outputEmbed] });
            }
            return { success: false, outputEmbed };
        }

        let resource = nextItem.resource;
        if (resource) {
            console.log(`${nextItem.title}${Colours.FgGreen} was already prepared${Colours.Reset}`);
        } else {
            console.log(`${Colours.FgYellow}preparing ${Colours.Reset}${nextItem.title}`);
            nextItem.prepare();
            await wait(Jukebot.config.maxReadyTime * 1000);
            resource = nextItem.resource;
            if (!resource) {
                this.play(silent);
                // TODO: make error embed
                const outputEmbed = new MessageEmbed()
                    .setTitle('Error')
                    .setDescription(
                        `Unable to generate audio resource in reasonable time (${Jukebot.config.maxReadyTime} seconds).`,
                    );
                if (!silent) {
                    await this._latestInteraction.channel.send({ embeds: [outputEmbed] });
                }
                return { success: false, outputEmbed };
            }
        }

        this._player.play(resource);
        try {
            await entersState(this._player, AudioPlayerStatus.Playing, Jukebot.config.maxReadyTime * 1000);
        } catch (error) {
            this.cleanup();
            // TODO: make error embed
            const outputEmbed = new MessageEmbed()
                .setTitle('Error')
                .setDescription(`Unable to start playing in reasonable time (${Jukebot.config.maxReadyTime} seconds).`);
            if (!silent) {
                await this._latestInteraction.channel.send({ embeds: [outputEmbed] });
            }
            return { success: false, outputEmbed };
        }

        console.log('setting playlock to false');
        this._playLock = false;

        this.makeActive(nextItem);

        const nextNextItem = this._inventory.at(0);
        if (nextNextItem) {
            nextNextItem.prepare(); // note lack of 'await'
        }

        // TODO: make "now playing embed"
        const outputEmbed = new MessageEmbed()
            .setTitle('Now Playing')
            .setDescription(nextItem.title)
            .setThumbnail(nextItem.thumbnail);
        if (!silent) {
            await this._latestInteraction.channel.send({ embeds: [outputEmbed] });
        }
        return { success: true, outputEmbed };
    }

    /** Called once the bot has been idle for more than the
     * {@link Jukebot.config configured idle time}.
     *
     * Calls the {@link Jukebox.cleanup} method after some basic checks.
     */
    private disconnectTimeout(): void {
        if (this._status.active) {
            console.log(
                `[${this._latestInteraction.guild.name}] disconnect timeout got called despite being active, this should never happen`,
            );
            return;
        } else console.log('disconnect timeout called');

        if (!Jukebot.config.inactivityTimeout) return;
        return this.cleanup();
    }

    /** Removes listeners, stops playblack, clears the queue, and destroys connection.
     *
     * Should only be called when the Jukebox needs to kill itself.
     *
     * All error logging should be done prior to this.
     */
    public cleanup(): void {
        console.log('cleaning up');
        this._player.removeAllListeners();
        this._connection.removeAllListeners();

        try {
            this._player.stop(true);
        } catch (error) {
            // don't care
        }

        try {
            this._connection.destroy();
        } catch (error) {
            // don't care
        }

        return this._destroyCallback(this._startingInteraction.guildId);
    }
}
