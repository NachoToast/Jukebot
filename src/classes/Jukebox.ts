import { FullInteraction, GuildedInteraction } from '../types/Interactions';
import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import Colours from '../types/Colours';
import { CurrentlyIdle, CurrentlyPlaying, CurrentStatus, DestroyCallback, WasPlaying } from '../types/Jukebox';
import { Jukebot } from './Client';
import { InteractionReplyOptions, MessageEmbed } from 'discord.js';
import { MusicDisc } from './MusicDisc';
import { promisify } from 'util';
import Messages from '../types/Messages';
import { getSearchType } from '../helpers/searchType';
import Hopper, { AddResponse } from './Hopper';

const wait = promisify(setTimeout);

/** Each Jukebox instance handles audio playback for a single guild. */
export class Jukebox {
    /** The interaction that created this instance. */
    private readonly _startingInteraction: FullInteraction;
    /** The latest interaction that caused this instance to join (or move to) a voice channel. */
    private _latestInteraction: FullInteraction;

    /** A function to run after {@link Jukebox.cleanup cleanup}.
     *
     * See how {@link Jukebot._removeJukebox Jukebot uses this}.
     */
    private readonly _destroyCallback: DestroyCallback;

    private _connection: VoiceConnection;
    public get connection(): VoiceConnection | undefined {
        return this._connection;
    }

    private _player: AudioPlayer;

    /** Array of to-be-played {@link MusicDisc music discs}. */
    private _inventory: MusicDisc[] = [];
    private _status: CurrentStatus = this.makeIdle();
    private _playLock = false;

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

        this._connection.on('error', (error) => {
            console.log(
                `[${this._latestInteraction.guild.name}] (connection) ${Colours.FgRed}error${Colours.Reset}`,
                error,
            );
            this.cleanup();
        });

        this._connection.on('stateChange', ({ status: oldStatus }, { status: newStatus }) => {
            if (oldStatus === newStatus) return;
            if (newStatus === VoiceConnectionStatus.Ready) this._connecting = false;
            else this._connecting = true;
        });

        this._player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

        this._player.on('error', (error) => {
            console.log(
                `[${this._latestInteraction.guild.name}] (player) ${Colours.FgRed}error${Colours.Reset}`,
                error,
            );
            this.cleanup();
        });
        this._player.on(AudioPlayerStatus.Idle, () => void this.play(false));
        this._player.on(AudioPlayerStatus.Paused, () => void this.makeIdle());
        this._player.on(AudioPlayerStatus.AutoPaused, () => void this.makeIdle());

        this._connection.subscribe(this._player);
    }

    private _connecting = true;

    /** Resolves once the connection has successfully joined the voice channel.
     * @throws Throws an error if it doesn't join in time.
     */
    private async waitTillConnected(): Promise<void> {
        if (this._connection.state.status === VoiceConnectionStatus.Ready) return;

        const maxTimeTillConnect = Jukebot.config.timeoutThresholds.connect;
        if (maxTimeTillConnect) {
            await entersState(this._connection, VoiceConnectionStatus.Ready, maxTimeTillConnect * 1000);
        } else {
            return new Promise<void>((resolve) => {
                this._connection.once(VoiceConnectionStatus.Ready, () => resolve());
            });
        }
    }

    private get ready() {
        const connectionReady = this._connection.state.status === VoiceConnectionStatus.Ready;
        const playerIdle = this._player.state.status === AudioPlayerStatus.Idle;
        const itemReady = !!this._inventory.at(0);
        const notLocked = !this._playLock;

        return connectionReady && playerIdle && itemReady && notLocked;
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
            leaveTimeout: setTimeout(
                () => this.disconnectTimeout(),
                Jukebot.config.timeoutThresholds.inactivity * 1000,
            ),
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
     * @param {GuildedInteraction} interaction - The interaction that invoke this request.
     * @param {boolean} [liveEdit] - Whether to make and edit a response over time,
     * or return everything all at once.
     */
    public async add(interaction: GuildedInteraction, liveEdit: true): Promise<void>;
    public async add(interaction: GuildedInteraction, liveEdit?: false): Promise<InteractionReplyOptions>;
    public async add(interaction: GuildedInteraction, liveEdit?: boolean): Promise<InteractionReplyOptions | void> {
        // search term validation
        const searchTerm = interaction.options.get('song', false)?.value;
        if (typeof searchTerm !== 'string') {
            const output = { content: 'Please specify something to search for' };
            if (liveEdit) {
                await interaction.editReply(output);
                return;
            } else return output;
        }

        // more search term validation
        const searchType = getSearchType(searchTerm);
        if (!searchType.valid) {
            const output = { content: '' };
            switch (searchType.type) {
                case 'otherURL':
                    output.content = 'Not a valid URL';
                    break;
                case 'spotify':
                    output.content = 'Not a valid Spotify URL';
                    break;
                case 'youtube':
                    output.content = 'Not a valid YouTube URL';
                    break;
                case 'textSearch':
                    output.content = 'Search term must be at least 3 letters long';
                    break;
            }
            if (liveEdit) {
                await interaction.editReply(output);
                return;
            } else return output;
        }

        // getting results
        const race: Promise<AddResponse | void>[] = [Hopper.add(interaction, searchTerm, searchType)];
        if (Jukebot.config.timeoutThresholds.getSearchResult) {
            const timeout = wait(Jukebot.config.timeoutThresholds.getSearchResult * 1000);
            race.push(timeout);
        }
        const results = await Promise.race(race);
        if (!results) {
            const output = {
                content: `Failed to find search results in reasonable time (${Jukebot.config.timeoutThresholds.getSearchResult} seconds)`,
            };
            if (liveEdit) {
                await interaction.editReply(output);
                return;
            } else return output;
        }

        // checking if search was successful
        if (!results.success) {
            const output = { content: results.errorMessages.join('\n') };
            if (liveEdit) {
                await interaction.editReply(output);
                return;
            } else return output;
        }
        if (results.type === 'multiple') {
            this._inventory.push(...results.items);
        } else {
            this._inventory.push(results.items);
        }

        if (this._connecting) {
            try {
                await this.waitTillConnected();
            } catch (error) {
                this.cleanup();
                const output = {
                    content: `Failed to connect in reasonable time (${Jukebot.config.timeoutThresholds.connect} seconds)`,
                };
                if (!liveEdit) {
                    await interaction.editReply(output);
                } else return output;
            }
        }

        // if ready to play another item, return the 'now playing' embed;
        if (this.ready) {
            const { outputEmbed } = await this.play(true);
            if (liveEdit) {
                await interaction.editReply({ embeds: [outputEmbed] });
            } else return { embeds: [outputEmbed] };
        } else {
            let embed: MessageEmbed;
            // otherwise make the added to queue embed
            if (results.type === 'multiple') {
                embed = new MessageEmbed().setTitle(`Added ${results.items.length} songs to the queue`).setDescription(
                    results.items
                        .slice(0, 10)
                        .map((e) => e.title)
                        .join('\n'),
                );
            } else {
                results.items;
                embed = new MessageEmbed()
                    .setTitle('Added to Queue')
                    .setDescription(results.items.title)
                    .setThumbnail(results.items.thumbnail);
            }
            if (liveEdit) {
                await interaction.editReply({ embeds: [embed] });
            } else return { embeds: [embed] };
        }
    }

    public get queue(): InteractionReplyOptions {
        if (!this._inventory.length) {
            return { content: 'The queue is empty' };
        }
        const embed = new MessageEmbed().setTitle('Queue');
        if (this._inventory.length < 10) {
            embed.setDescription(
                this._inventory.map((e, i) => `${i + 1}. ${e.title} (${e.durationString})`).join('\n'),
            );
        } else {
            embed.setDescription(
                this._inventory
                    .slice(0, 10)
                    .map((e, i) => `${i + 1}. ${e.title} (${e.durationString})`)
                    .join('\n') + `*+${this._inventory.length - 10} more...*`,
            );
        }
        return { embeds: [embed] };
    }

    public get nowPlaying(): InteractionReplyOptions {
        if (!this._status.active) {
            return { content: Messages.NotPlaying };
        }
        const embed = new MessageEmbed().setTitle('Currently Playing');

        const { title, thumbnail } = this._status.musicDisc;
        embed.setDescription(title).setThumbnail(thumbnail);

        return { embeds: [embed] };
    }

    public async skip(): Promise<InteractionReplyOptions> {
        const { outputEmbed, success } = await this.play(true);
        if (success) {
            return { embeds: [outputEmbed] };
        } else return { content: 'Failed to skip the current song' };
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
            const race: Promise<AudioResource<MusicDisc> | void>[] = [nextItem.prepare()];
            if (Jukebot.config.timeoutThresholds.generateResource) {
                const timeout = wait(Jukebot.config.timeoutThresholds.generateResource * 1000);
                race.push(timeout);
            }

            console.log(`${Colours.FgRed}preparing ${Colours.Reset}${nextItem.title}`);
            const nextResource = await Promise.race(race);
            resource = nextResource ?? undefined;
            if (!resource) {
                // try play next song
                this.play(silent);
                // TODO: make error embed
                const outputEmbed = new MessageEmbed()
                    .setTitle('Error')
                    .setDescription(
                        `Unable to generate audio resource in reasonable time (${Jukebot.config.timeoutThresholds.generateResource} seconds).\nSkipping to next song in queue.`,
                    );
                if (!silent) {
                    await this._latestInteraction.channel.send({ embeds: [outputEmbed] });
                }
                return { success: false, outputEmbed };
            }
        }

        this._player.play(resource);

        const maxTimeTillPlay = Jukebot.config.timeoutThresholds.play;
        if (maxTimeTillPlay) {
            try {
                await entersState(this._player, AudioPlayerStatus.Playing, maxTimeTillPlay * 1000);
            } catch (error) {
                const outputEmbed = new MessageEmbed()
                    .setTitle('Error')
                    .setDescription(
                        `Unable to start playing in reasonable time (${maxTimeTillPlay} seconds).\nSkipping to next song in queue.`,
                    );
                this.play(silent);
                if (!silent) {
                    await this._latestInteraction.channel.send({ embeds: [outputEmbed] });
                }
                return { success: false, outputEmbed };
            }
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

        if (!Jukebot.config.timeoutThresholds.inactivity) return;
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
