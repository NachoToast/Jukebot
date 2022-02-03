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
import { Jukebot } from './Client';
import {
    BaseMessageComponentOptions,
    InteractionReplyOptions,
    Message,
    MessageActionRow,
    MessageActionRowOptions,
    MessageAttachment,
    MessageEmbed,
    MessageEmbedOptions,
    Snowflake,
} from 'discord.js';
import { MusicDisc } from './MusicDisc';
import { promisify } from 'util';
import Messages from '../types/Messages';
import { getSearchType, SpotifyURLSubtypes, YouTubeURLSubtypes } from '../helpers/searchType';
import Hopper, { AddResponse } from './Hopper';
import { viewCountFormatter } from '../helpers/viewCountFormatter';
import { memberNicknameMention } from '@discordjs/builders';
import { numericalToString } from '../helpers/timeConverters';
import moment from 'moment';
import { DiscImages } from '../types/MusicDisc';
import { APIEmbed } from 'discord-api-types';
import { createCanvas, registerFont } from 'canvas';
import path from 'path';

const wait = promisify(setTimeout);

type DestroyCallback = (guildId: Snowflake) => void;

interface SendOrEditOptions {
    content?: string | null;
    embeds?: (MessageEmbed | MessageEmbedOptions | APIEmbed)[];
    components?: (MessageActionRow | (Required<BaseMessageComponentOptions> & MessageActionRowOptions))[];
}

/** Information about how far through the current song is.
 * All values are in seconds.
 */
interface DurationInfo {
    total: number;
    current: number;
    remaining: number;
}

/** The shape of the Jukebox's status when something is currently being played. */
interface ActiveStatus {
    active: true;
    musicDisc: MusicDisc;

    /** This should not be used to determine when a song started playing,
     * only how long the song has been playing for.
     *
     * This is because the player can be paused, which this accounts for. */
    playingSince: number;
}

/** The shape of the Jukebox's status when something is not currently being played. */
interface IdleStatus {
    active: false;
    idleSince: number;
    wasPlaying?: {
        musicDisc: MusicDisc;

        /** How far through the song was, in seconds. */
        for: number;
    };
    leaveTimeout: NodeJS.Timeout;
}

type Status = IdleStatus | ActiveStatus;

/** Each Jukebox instance handles audio playback for a single guild. */
export class Jukebox {
    /** The interaction that created this instance. */
    private readonly _startingInteraction: FullInteraction;
    /** The latest interaction that caused this instance to join (or move to) a voice channel. */
    private _latestInteraction: FullInteraction;

    /** The latest automatic "now playing" message that was sent.
     *
     * Doesn't count ones sent by the /nowplaying command.
     */
    private _latestNowPlaying?: Message;

    /** A function to run after {@link Jukebox.cleanup cleanup}.
     *
     * See how {@link Jukebot._removeJukebox Jukebot uses this}.
     */
    private readonly _destroyCallback: DestroyCallback;

    private _connection?: VoiceConnection;

    private _player: AudioPlayer;

    /** Array of to-be-played {@link MusicDisc music discs}. */
    private _inventory: MusicDisc[] = [];
    private _status: Status = this.makeIdle();

    /** Whether this is currently in the process of playing something
     * (e.g. waiting for a resource).
     */
    private _playLock = false;

    /** Whether the connection is attempting to join a channel. */
    private _connecting = true;

    public constructor(interaction: FullInteraction, destroyCallback: DestroyCallback) {
        this._startingInteraction = interaction;
        this._latestInteraction = interaction;
        this._destroyCallback = destroyCallback;

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
    }

    /** Resolves once the connection has successfully joined the voice channel.
     * @throws Throws an error if it doesn't join in time.
     */
    private async waitTillConnected(): Promise<VoiceConnection> {
        if (this._connection?.state.status === VoiceConnectionStatus.Ready) return this._connection;

        const connection: VoiceConnection =
            this._connection ||
            joinVoiceChannel({
                channelId: this._latestInteraction.member.voice.channelId,
                guildId: this._latestInteraction.guildId,
                adapterCreator: this._latestInteraction.guild.voiceAdapterCreator,
                selfDeaf: true,
            });

        const maxTimeTillConnect = Jukebot.config.timeoutThresholds.connect;
        if (maxTimeTillConnect) {
            await entersState(connection, VoiceConnectionStatus.Ready, maxTimeTillConnect * 1000);
        } else {
            await new Promise<VoiceConnection>((resolve) => {
                connection.once(VoiceConnectionStatus.Ready, () => resolve(connection));
            });
        }

        connection.on('error', (error) => {
            console.log(
                `[${this._latestInteraction.guild.name}] (connection) ${Colours.FgRed}error${Colours.Reset}`,
                error,
            );
            this.cleanup();
        });

        connection.on('stateChange', ({ status: oldStatus }, { status: newStatus }) => {
            if (oldStatus === newStatus) return;
            if (newStatus === VoiceConnectionStatus.Ready) this._connecting = false;
            else this._connecting = true;
        });

        connection.subscribe(this._player);

        this._connection = connection;

        return connection;
    }

    private get ready() {
        const connectionReady = this._connection?.state.status === VoiceConnectionStatus.Ready;
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
    private makeIdle(): IdleStatus {
        let wasPlaying: IdleStatus['wasPlaying'];

        // optional chaining since this method is called on startup (status will be undefined),
        if (this._status?.active) {
            wasPlaying = {
                musicDisc: this._status.musicDisc,
                for: Math.floor((Date.now() - this._status.playingSince) / 1000),
            };
        }

        const newCurrent: IdleStatus = {
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
     * @returns {ActiveStatus} The new playing status.
     */
    private makeActive(musicDisc: MusicDisc): ActiveStatus {
        let playingSince = Date.now();

        if (!this._status.active) {
            if (this._status.wasPlaying) {
                playingSince -= this._status.wasPlaying.for * 1000;
            }
            clearTimeout(this._status.leaveTimeout);
        }

        const newCurrent: ActiveStatus = {
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
        // queue length checks
        const maxQueueSize = Jukebot.config.maxQueueSize;
        if (maxQueueSize && this._inventory.length >= maxQueueSize) {
            const output: InteractionReplyOptions = { content: `❌ The queue is at maximum size (${maxQueueSize})` };
            if (liveEdit) {
                await interaction.editReply(output);
                return;
            } else return output;
        }

        // search term validation
        const searchTerm = interaction.options.get('song', false)?.value;
        if (typeof searchTerm !== 'string') {
            const output: InteractionReplyOptions = { content: 'Please specify something to search for' };
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

        // check if search actually had results
        if ((results.type === 'multiple' && !results.items.length) || (results.type === 'single' && !results.items)) {
            const output = this.makeNoResultsEmbed(results);
            if (liveEdit) {
                await interaction.editReply(output);
                return;
            } else return output;
        }

        // slice results to enforce max queue length

        const firstIndex = this._inventory.length;

        if (results.type === 'multiple') {
            // enforce max queue length
            if (maxQueueSize) {
                const maxNumberToAdd = maxQueueSize - results.items.length;
                results.items = results.items.slice(0, maxNumberToAdd);
            }

            if (results.items.length) this._inventory.push(...results.items);
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

        // if ready to play instantly, return the 'now playing' embed
        if (this.ready) {
            const nowPlayingEmbed = await this.play(true);

            // adding a playlist should an 'added to queue' instead of a 'now playing'
            const payloadToSend: InteractionReplyOptions =
                results.type === 'single'
                    ? nowPlayingEmbed
                    : { embeds: [this.makeAddedToQueueEmbed(interaction, firstIndex, results)] };

            if (liveEdit) {
                await interaction.editReply(payloadToSend);
            } else return payloadToSend;
        }

        // otherwise return the 'added to queue' embed
        else {
            const addedToQueueEmbed = this.makeAddedToQueueEmbed(interaction, firstIndex, results);
            if (liveEdit) {
                await interaction.editReply({ embeds: [addedToQueueEmbed] });
            } else return { embeds: [addedToQueueEmbed] };
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
        const { embed, file } = this.makeNowPlayingEmbed(this._status, true);

        return { embeds: [embed], files: [file] };
    }

    public async skip(): Promise<void> {
        const willStop = this._player.stop();
        if (!willStop) throw new Error('Played refused to stop 💀');
        try {
            await entersState(this._player, AudioPlayerStatus.Idle, 3_000);
        } catch (error) {
            throw new Error('Unable to stop in reasonable time (3 seconds)');
        }
        return await this.play(false);
    }

    /** Attemts to play the next item in the queue.
     * @param {booolean} silent - If false, will send the results to the
     * {@link Jukebox._latestInteraction output channel}, otherwise will
     * return the results.
     *
     * @returns {Promise<InteractionReplyOptions|null>} A
     * {@link InteractionReplyOptions} object containing an embed if silent, otherwise nothing.
     */
    private async play(silent: true): Promise<InteractionReplyOptions>;
    private async play(silent: false): Promise<void>;
    private async play(silent: boolean): Promise<InteractionReplyOptions | void> {
        this._playLock = true;
        const nextItem = this._inventory.shift();
        if (!nextItem) {
            this.makeIdle();
            this._playLock = false;
            // TODO: make queue finished embed
            const output: InteractionReplyOptions = { content: 'The queue has finished' };

            if (!silent) return await this.sendOrUpdateMessage(output);
            else return output;
        }

        let resource = nextItem.resource;
        if (resource) {
            // eslint-disable-next-line max-len
            // console.log(`${nextItem.title}${Colours.FgGreen} was already prepared${Colours.Reset}`);
        } else {
            const race: Promise<AudioResource<MusicDisc> | void>[] = [nextItem.prepare()];
            if (Jukebot.config.timeoutThresholds.generateResource) {
                const timeout = wait(Jukebot.config.timeoutThresholds.generateResource * 1000);
                race.push(timeout);
            }

            // console.log(`${Colours.FgRed}preparing ${Colours.Reset}${nextItem.title}`);
            const nextResource = await Promise.race(race);
            resource = nextResource ?? undefined;
            if (!resource) {
                // try play next song
                this.play(false);
                const output: InteractionReplyOptions = {
                    content: `Unable to generate audio resource in reasonable time (${Jukebot.config.timeoutThresholds.generateResource} seconds).\nSkipping to next song in queue.`,
                };
                if (!silent) return await this.sendOrUpdateMessage(output);
                return output;
            }
        }

        if (!this._connection) {
            try {
                await this.waitTillConnected();
            } catch (error) {
                const output: InteractionReplyOptions = {
                    content: `Unable to conect in reasonable time (${Jukebot.config.timeoutThresholds.connect} seconds)`,
                };
                if (!silent) return await this.sendOrUpdateMessage(output);
                else return output;
            }
        }

        this._player.play(resource);

        const maxTimeTillPlay = Jukebot.config.timeoutThresholds.play;
        if (maxTimeTillPlay) {
            try {
                await entersState(this._player, AudioPlayerStatus.Playing, maxTimeTillPlay * 1000);
            } catch (error) {
                const output: InteractionReplyOptions = {
                    content: `Unable to start playing in reasonable time (${maxTimeTillPlay} seconds).\nSkipping to next song in queue.`,
                };
                this.play(false);
                if (!silent) return await this.sendOrUpdateMessage(output);
                else return output;
            }
        }

        this._playLock = false;

        const activeStatus = this.makeActive(nextItem);

        const nextNextItem = this._inventory.at(0);
        if (nextNextItem) {
            nextNextItem.prepare(); // note lack of 'await'
        }

        const nowPlayingEmbed = this.makeNowPlayingEmbed(activeStatus);
        if (!silent) return await this.sendOrUpdateMessage({ embeds: [nowPlayingEmbed] });
        else return { embeds: [nowPlayingEmbed] };
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
        this._connection?.removeAllListeners();

        try {
            this._player.stop(true);
        } catch (error) {
            // don't care
        }

        try {
            this._connection?.destroy();
        } catch (error) {
            // don't care
        }

        return this._destroyCallback(this._startingInteraction.guildId);
    }

    private async sendOrUpdateMessage(options: SendOrEditOptions): Promise<void> {
        if (this._latestNowPlaying) {
            const isLatestMessage = this._latestNowPlaying.channel.lastMessage?.id === this._latestNowPlaying.id;
            if (isLatestMessage && this._latestNowPlaying.editable) {
                await this._latestNowPlaying.edit(options);
                return;
            }
        }
        const msg = await this._latestInteraction.channel.send(options);
        this._latestNowPlaying = msg;
        return;
    }

    /** Gets the total length of a subset of items in the queue.
     * @param {number} [start] - Slice start index.
     * @param {number} [end] - Slice end index.
     *
     * For more detailed parameter documentation, see the
     * {@link Array.slice Array.slice} method.
     *
     * @returns {number} Total length of these items in seconds.
     *
     * Note this doesn't account for the song currently playing
     * (since songs get removed from the queue when they start playing), so
     * it's recommended to also call the
     *  {@link Jukebox.getCurrentSongInfo getCurentSongInfo} method if you
     * need information about the currently-playing song too.
     */
    private getTotalLength(start?: number, end?: number): number {
        const items = this._inventory.slice(start, end);

        let totalDuration = 0;
        for (const item of items) {
            totalDuration += item.durationSeconds;
        }
        return totalDuration;
    }

    /** Gets duration info about the currently playing song.
     *
     * If no song is currently playing,
     * will get information about the previously playing song instead.
     *
     * @throws Throws an error if there was no previously playing song.
     *
     */
    private getCurrentSongInfo(): DurationInfo {
        if (this._status.active) {
            const current = Math.floor((Date.now() - this._status.playingSince) / 1000);
            const total = this._status.musicDisc.durationSeconds;
            const remaining = total - current;
            return { current, total, remaining };
        } else if (this._status.wasPlaying) {
            const total = this._status.wasPlaying.musicDisc.durationSeconds;
            const current = this._status.wasPlaying.for;
            const remaining = total - current;
            return { current, total, remaining };
        } else throw new Error('Tried to get duration info but no current or previously playing song');
    }

    private makeNowPlayingEmbed(
        { musicDisc }: ActiveStatus,
        progressBar: true,
    ): { embed: MessageEmbed; file: MessageAttachment };

    private makeNowPlayingEmbed({ musicDisc }: ActiveStatus, progressBar?: false): MessageEmbed;
    private makeNowPlayingEmbed(
        { musicDisc }: ActiveStatus,
        progressBar?: boolean,
    ):
        | MessageEmbed
        | {
              embed: MessageEmbed;
              file: MessageAttachment;
          } {
        const description: string[] = [
            `Duration: ${musicDisc.durationString}`,
            `Views: ${viewCountFormatter(musicDisc.views)}`,
            `Channel: ${musicDisc.channel}`,
        ];

        const embed = new MessageEmbed()
            .setAuthor({ name: 'Now Playing', iconURL: musicDisc.addedBy.displayAvatarURL() })
            .setTitle(musicDisc.title)
            .setURL(musicDisc.url)
            .setThumbnail(musicDisc.thumbnail)
            .setDescription(description.join('\n'))
            .addField(
                'Requested By',
                `${memberNicknameMention(musicDisc.addedBy.id)} ${moment(musicDisc.addedAt).fromNow()}`,
            )
            .setFooter({
                text: `Queue Length: ${numericalToString(this.getTotalLength())} (${this._inventory.length} song${
                    this._inventory.length !== 1 ? 's' : ''
                })`,
            })
            .setColor(Jukebot.config.colourTheme);

        if (!progressBar) return embed;

        const file = this.makeProgressBar();

        embed.setImage('attachment://progressbar.png');

        return { embed, file };
    }

    /** Makes an appropriate embed for a hopper {@link AddResponse response}
     * that found no results.
     */
    private makeNoResultsEmbed(hopperResult: AddResponse & { success: true }): InteractionReplyOptions {
        if (hopperResult.type === 'single') {
            if (hopperResult.source === 'youtube') {
                // youtube search with no results
                hopperResult.searchType;
                return { content: "Couldn't find a YouTube video with that URL, is it private?" };
            } else {
                // we didnt fetch the result
                if (hopperResult.conversionInfo) {
                    const { originalName, youtubeEquivalent, levenshtein } = hopperResult.conversionInfo;
                    hopperResult.conversionInfo.youtubeEquivalent;
                    return {
                        content: `Couldn't find a valid YouTube search for "${originalName}"${
                            youtubeEquivalent
                                ? ` (closest was ${youtubeEquivalent} with a similarity of ${
                                      levenshtein?.toFixed(2) ?? 'n/a'
                                  })`
                                : ''
                        }`,
                    };
                }

                // we didnt find the result
                else {
                    if (hopperResult.searchType.type === 'spotify') {
                        return { content: 'That track could not be found on YouTube' };
                    }
                    return { content: 'No results found' };
                }
            }
        } else {
            const containerName = hopperResult.searchType.subtype[0];
            const itemName = hopperResult.source === 'spotify' ? 'tracks' : 'videos';

            if (!hopperResult.playlistSize) {
                // empty playlist
                const embed = new MessageEmbed()
                    .setTitle(`Empty ${containerName[0].toUpperCase() + containerName.slice(1)}`)
                    .setDescription(
                        `Failed to find any ${itemName} in the ${containerName} ${hopperResult.playlistName}`,
                    )
                    .setThumbnail(hopperResult.playlistImageURL)
                    .setColor(Jukebot.config.colourTheme);

                return { embeds: [embed] };
            } else {
                // playlist had videos, but

                // we didnt fetch any
                if (hopperResult.source === 'spotify' && hopperResult.conversionInfo.length) {
                    const description: string[] = [
                        'Refused to load any songs from playlist since their YouTube searches were not close enough.',
                        `The configured minimum similarity is ${Jukebot.config.levenshteinThreshold}.`,
                        'Here are some results from the playlist:',
                    ];

                    for (let i = 0, len = Math.min(hopperResult.conversionInfo.length, 3); i < len; i++) {
                        const { originalName, youtubeEquivalent, levenshtein } = hopperResult.conversionInfo[i];
                        if (!youtubeEquivalent) {
                            description.push(`${i + 1}. ${originalName} -> No YouTube Equivalent`);
                        } else {
                            description.push(
                                `${i + 1}. ${originalName} -> ${youtubeEquivalent} (${
                                    levenshtein?.toFixed(2) ?? 'n/a'
                                })`,
                            );
                        }
                    }

                    if (hopperResult.conversionInfo.length > 3) {
                        description.push(`${hopperResult.conversionInfo.length - 3} more...`);
                    }

                    const embed = new MessageEmbed()
                        .setTitle('Refusing Results')
                        .setDescription(description.join('\n'))
                        .setThumbnail(hopperResult.playlistImageURL)
                        .setColor(Jukebot.config.colourTheme);

                    return { embeds: [embed] };
                }
                // we didnt find any
                else {
                    const embed = new MessageEmbed()
                        .setTitle(`Failed Getting ${itemName[0].toUpperCase() + itemName.slice(1)}`)
                        .setDescription(
                            `Unable to get ${itemName} from ${containerName} "${hopperResult.playlistName}" (is it private?).`,
                        )
                        .setThumbnail(hopperResult.playlistImageURL)
                        .setColor(Jukebot.config.colourTheme);

                    return { embeds: [embed] };
                }
            }
        }
    }

    /** Makes an appropriate embed for a hopper {@link AddResponse response}.
     *
     * Call this **after** adding the items to the queue.
     *
     * @throws An error if no items are present, be sure to check first
     * (and call the {@link Jukebox.makeNoResultsEmbed no results embed constructor} if necessary).
     */
    private makeAddedToQueueEmbed(
        interaction: GuildedInteraction,
        firstIndex: number,
        hopperResult: AddResponse & { success: true },
    ): MessageEmbed {
        if (Array.isArray(hopperResult.items) ? !hopperResult.items.length : !hopperResult.items) {
            throw new Error('Trying to make queue embed with no items');
        }

        let secondsTillPlay = this.getTotalLength(undefined, firstIndex);
        if (this._status.active || this._status.wasPlaying) {
            const { remaining } = this.getCurrentSongInfo();
            secondsTillPlay += remaining;
        }
        const timeTillPlay = numericalToString(secondsTillPlay);

        const embed = new MessageEmbed()
            .setFooter({
                text: `Queue Length: ${numericalToString(this.getTotalLength())} (${this._inventory.length} song${
                    this._inventory.length !== 1 ? 's' : ''
                })`,
                iconURL: interaction.guild.iconURL() || DiscImages.Pigstep,
            })
            .setColor(Jukebot.config.colourTheme);

        if (firstIndex) {
            embed.addField(`Position in Queue: ${firstIndex}`, `Time till play: ${timeTillPlay}`);
        }

        if (hopperResult.type === 'single') {
            const disc = hopperResult.items;
            const description: string[] = [`Duration: ${disc.durationString}`];

            if (disc.views) description.push(`Views: ${viewCountFormatter(disc.views)}`);
            description.push(`Channel: ${disc.channel}`);

            embed
                .setAuthor({ name: 'Added to Queue', iconURL: interaction.member.displayAvatarURL() })
                .setTitle(disc.title)
                .setURL(disc.url)
                .setThumbnail(disc.thumbnail)
                .setDescription(description.join('\n'));
        } else {
            const itemType = hopperResult.source === 'youtube' ? 'Video' : 'Track';

            embed
                .setAuthor({
                    name: `Added ${hopperResult.items.length} ${itemType}${
                        hopperResult.items.length !== 1 ? 's' : ''
                    } to Queue`,
                    iconURL: interaction.member.displayAvatarURL(),
                })
                .setTitle(hopperResult.playlistName)
                .setURL(hopperResult.playlistURL)
                .setThumbnail(hopperResult.playlistImageURL);

            const addedLength = numericalToString(
                hopperResult.items.map(({ durationSeconds }) => durationSeconds).reduce((prev, next) => prev + next),
            );

            let authorLine: string;
            switch (hopperResult.searchType.subtype) {
                case YouTubeURLSubtypes.Playlist:
                case SpotifyURLSubtypes.Playlist:
                    authorLine = `Made By: ${hopperResult.createdBy}`;
                    break;
                case SpotifyURLSubtypes.Album:
                    authorLine = `Artist${hopperResult.createdBy.length != 1 ? 's' : ''}: ${
                        hopperResult.createdBy.length > 1
                            ? hopperResult.createdBy.slice(0, -1).join(', ') +
                              `and ${hopperResult.createdBy.at(-1) ?? 'Unknown'}`
                            : hopperResult.createdBy.at(0) ?? 'Unknown'
                    }`;
                    break;
            }

            // added all items = dont worry about including other stats
            if (hopperResult.playlistSize === hopperResult.items.length) {
                const description: string[] = [`Duration: ${addedLength}`, authorLine];

                const songSummary: string[] = [];

                for (let i = 0, len = Math.min(hopperResult.playlistSize, 9); i < len; i++) {
                    const { title, durationString } = hopperResult.items[i];
                    songSummary.push(`${i + 1}. ${title} (${durationString})`);
                }

                if (hopperResult.playlistSize > 9) {
                    songSummary.push(`${hopperResult.playlistSize - 9} more...`);
                }

                embed.setDescription(description.join('\n')).addField('Songs Preview', songSummary.join('\n'));
            }

            // otherwise, we need to inform why some of the videos weren't added
            else {
                const description: string[] = [
                    `Duration: ${addedLength}`,
                    `Total ${
                        hopperResult.searchType.subtype === SpotifyURLSubtypes.Album ? 'Album' : 'Playlist'
                    } Size: ${hopperResult.playlistSize}`,
                    authorLine,
                ];

                embed.setDescription(description.join('\n'));

                const songSummary: string[] = [];

                for (let i = 0, len = Math.min(hopperResult.items.length, 9); i < len; i++) {
                    const { title, durationString } = hopperResult.items[i];
                    songSummary.push(`${i + 1}. ${title} (${durationString})`);
                }

                if (hopperResult.items.length > 9) {
                    songSummary.push(`${hopperResult.items.length - 9} more...`);
                }

                embed.addField('Songs Preview', songSummary.join('\n'));

                let numUnaccountedFor = hopperResult.playlistSize - hopperResult.items.length;

                // some items might not have had a valid YouTube equivalent
                if (hopperResult.source === 'spotify') {
                    const noYouTubeAtAll: string[] = [];
                    const youTubeTooDissimilar: { spotify: string; youtube: string; similarity: number }[] = [];
                    for (let i = 0, len = hopperResult.conversionInfo.length; i < len; i++) {
                        const item = hopperResult.conversionInfo[i];
                        if (!item.youtubeEquivalent) noYouTubeAtAll.push(item.originalName);
                        else if (item.levenshtein !== null && item.levenshtein < Jukebot.config.levenshteinThreshold) {
                            youTubeTooDissimilar.push({
                                spotify: item.originalName,
                                youtube: item.youtubeEquivalent,
                                similarity: item.levenshtein,
                            });
                        }
                    }

                    numUnaccountedFor -= noYouTubeAtAll.length + youTubeTooDissimilar.length;

                    if (noYouTubeAtAll.length) {
                        if (noYouTubeAtAll.length === 1) {
                            embed.addField(
                                '⚠️ Missing Result',
                                `"${noYouTubeAtAll[0]}" didn't have any results when searched on YouTube.`,
                                true,
                            );
                        } else {
                            embed.addField(
                                `⚠️ ${noYouTubeAtAll.length} Missing Results`,
                                `Some Tracks didn't have any results when searched on YouTube: "${noYouTubeAtAll
                                    .slice(0, 3)
                                    .join('", "')}"${noYouTubeAtAll.length > 3 ? ' ...' : ''}`,
                            );
                        }
                    }

                    if (youTubeTooDissimilar.length) {
                        if (youTubeTooDissimilar.length === 1) {
                            embed.addField(
                                '⚠️ Invalid Result',
                                `"${
                                    youTubeTooDissimilar[0].spotify
                                }" had a search result that wasn't close enough to it's name: ${
                                    youTubeTooDissimilar[0].youtube
                                } (${youTubeTooDissimilar[0].similarity.toFixed(2)})`,
                            );
                        } else {
                            const examples: string[] = [];

                            for (let i = 0, len = Math.min(youTubeTooDissimilar.length, 3); i < len; i++) {
                                const { spotify, youtube, similarity } = youTubeTooDissimilar[i];
                                examples.push(`${spotify} -> ${youtube} (${similarity.toFixed(2)})`);
                            }

                            if (youTubeTooDissimilar.length > 3) {
                                examples.push('...');
                            }

                            embed.addField(
                                `⚠️ ${youTubeTooDissimilar.length} Invalid Results`,
                                `Some Tracks had search results that weren't close enough to their original names:\n${examples.join(
                                    '\n',
                                )}`,
                            );
                        }
                    }
                }

                // some items weren't added due to max length limit
                const maxQueueSize = Jukebot.config.maxQueueSize;
                if (
                    numUnaccountedFor &&
                    maxQueueSize &&
                    this._inventory.length + hopperResult.playlistSize >= maxQueueSize
                ) {
                    const numAffected = firstIndex + hopperResult.playlistSize - maxQueueSize;
                    if (numAffected) {
                        numUnaccountedFor -= numAffected;

                        embed.addField(
                            '🚫 Discarded Results',
                            `${numAffected} ${itemType}${
                                numAffected !== 1 ? 's' : ''
                            } were discarded since the queue reached it maximum size (${Jukebot.config.maxQueueSize}).`,
                            true,
                        );
                    }
                }

                // still unaccounted for = no clue lmao
                if (numUnaccountedFor) {
                    embed.addField(
                        '❓ Unknown Errors',
                        `${numUnaccountedFor} ${itemType}${
                            numUnaccountedFor !== 1 ? 's' : ''
                        } had unknown errors.\n¯\\_(ツ)_/¯`,
                        true,
                    );
                }
            }
        }

        return embed;
    }

    private makeProgressBar(length: number = 300, height: number = 20): MessageAttachment {
        const { current, total } = this.getCurrentSongInfo();

        registerFont(path.join(__dirname, '../', 'helpers', 'Roboto-Regular.ttf'), { family: 'roboto' });

        const canvas = createCanvas(length, height);
        const ctx = canvas.getContext('2d');

        // #2f3136 is discord embed bg colour
        ctx.fillStyle = 'gray';
        ctx.fillRect(0, 0, length, height);

        const fractionFilled = current / total;
        const amountFilled = Math.floor(fractionFilled * length);
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, amountFilled, height);

        ctx.font = "16px 'roboto'";
        ctx.fillStyle = 'white';
        ctx.fillText(`${numericalToString(current)} / ${numericalToString(total)}`, 5, 15);

        return new MessageAttachment(canvas.toBuffer(), 'progressbar.png');
    }
}
