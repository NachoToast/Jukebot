import { GuildedInteraction } from '../types/Interactions';
import { MusicDisc } from './MusicDisc';
import { AddResponse, BaseFailureReasons, FailReason, YouTubeFailureReasons } from '../types/Hopper';
import { numericalToString } from '../helpers/timeConverters';
import { getSearchType, OtherTypes, SpotifyURLTypes, YouTubeURLTypes } from '../helpers/searchType';
import { search, video_basic_info } from 'play-dl';
import { MessageEmbed } from 'discord.js';
import { viewCountFormatter } from '../helpers/viewCountFormatter';
import { DiscImages } from '../types/MusicDisc';
import { Jukebot } from '../client/Client';
import { Jukebox } from './Jukebox';
import { memberNicknameMention } from '@discordjs/builders';
import moment from 'moment';

/** Hopper instances handle the storing and serving of `MusicDiscs` to a `Jukeblock`. */
export class Hopper {
    private readonly _jukebox: Jukebox;

    /** The queued songs. */
    public inventory: MusicDisc[] = [];

    public constructor(jukebox: Jukebox) {
        this._jukebox = jukebox;
    }

    /** Attempts to search for and add a song, album or playlist to the queue.
     *
     * The bulk of this method is handling different search types.
     *
     * @param {GuildedInteraction} interaction The interaction, must have a `song` option specified.
     *
     * @returns {Promise<AddResponse>} Information about the operation.
     */
    public async add(interaction: GuildedInteraction): Promise<AddResponse> {
        if (Jukebot.config.maxQueueSize && this.inventory.length >= Jukebot.config.maxQueueSize) {
            return { failure: true, reason: BaseFailureReasons.QueueTooLarge };
        }

        const queryString = interaction.options.get('song', true).value;
        if (!queryString || typeof queryString !== 'string' || queryString.length < 3) {
            return { failure: true, reason: BaseFailureReasons.InvalidQuery };
        }

        const searchType = getSearchType(queryString);

        if (!searchType.valid) {
            let reason: FailReason;
            switch (searchType.type) {
                case YouTubeURLTypes.Invalid:
                    reason = YouTubeFailureReasons.InvalidURL;
                    break;
                case SpotifyURLTypes.Invalid:
                    reason = BaseFailureReasons.InvalidSpotifyURL;
                    break;
                case OtherTypes.InvalidURL:
                case OtherTypes.InvalidTextSearch:
                default:
                    reason = BaseFailureReasons.InvalidQuery;
                    break;
            }
            return { failure: true, reason };
        }

        switch (searchType.type) {
            case YouTubeURLTypes.Video: {
                const res = await this.addFromYouTubeVideoURL(interaction, queryString);
                if (res instanceof MusicDisc) {
                    return {
                        failure: false,
                        output: { embeds: [this.makeEnqueuedSongEmbed(interaction, this.inventory.length - 1)] },
                    };
                }
                return { failure: true, reason: res };
            }
            case YouTubeURLTypes.Playlist:
                return { failure: false, output: { content: 'not yet implemented' } };
            case SpotifyURLTypes.Track:
                return { failure: false, output: { content: 'not yet implemented' } };
            case SpotifyURLTypes.Playlist:
                return { failure: false, output: { content: 'not yet implemented' } };
            case SpotifyURLTypes.Album:
                return { failure: false, output: { content: 'not yet implemented' } };
        }

        const res = await this.addFromtextSearchTerm(interaction, queryString);
        if (res instanceof MusicDisc) {
            return {
                failure: false,
                output: { embeds: [this.makeEnqueuedSongEmbed(interaction, this.inventory.length - 1)] },
            };
        }
        return { failure: true, reason: res };
    }

    /** Add from a YouTube video URL. */
    private async addFromYouTubeVideoURL(
        interaction: GuildedInteraction,
        url: string,
    ): Promise<FailReason | MusicDisc> {
        const video = (await video_basic_info(url)).video_details;

        if (!video) return YouTubeFailureReasons.NonExistent;
        if (video.private) return YouTubeFailureReasons.Private;
        if (video.upcoming) return YouTubeFailureReasons.Premiere;
        if (video.live) return YouTubeFailureReasons.Live;
        if (!video.title) return YouTubeFailureReasons.NoData;

        const title = video.title;

        const musicDisc = new MusicDisc(interaction, video, title);
        this.inventory.push(musicDisc);
        return musicDisc;
    }

    /** Add from a YouTube playlist URL.
     * @deprecated Don't use this yet.
     */
    private async addFromyouTubePlaylistURL(
        interaction: GuildedInteraction,
        url: string,
    ): Promise<FailReason | MusicDisc[]> {
        const playlist = (await search(url, { source: { youtube: 'playlist' }, limit: 1 })).shift();
        playlist;
        return YouTubeFailureReasons.NoData;
    }

    /** Add from a text search. */
    private async addFromtextSearchTerm(
        interaction: GuildedInteraction,
        queryString: string,
    ): Promise<FailReason | MusicDisc> {
        const video = (await search(queryString, { source: { youtube: 'video' }, limit: 1 })).shift();

        if (!video) return YouTubeFailureReasons.NonExistent;
        if (video.private) return YouTubeFailureReasons.Private;
        if (video.upcoming) return YouTubeFailureReasons.Premiere;
        if (video.live) return YouTubeFailureReasons.Live;
        if (!video.title) return YouTubeFailureReasons.NoData;

        const title = video.title;

        const musicDisc = new MusicDisc(interaction, video, title);
        this.inventory.push(musicDisc);
        return musicDisc;
    }

    /** Gets the time until a song will play in the queue.
     * @param {number} [position=1] The position of the item in the queue,
     * with 1 being the first item.
     * @returns {[number, string]} The time until this song will be played,
     * in seconds and in string form.
     */
    public getTimeTillPlay(position: number = 1): [number, string] {
        // TODO: account for currently playing song,
        // cuz currently position 1 = 0 seconds

        const applicableSongs = this.inventory.slice(0, position - 1).map((e) => e.durationSeconds);

        let timeLeft = 0;
        const currentlyPlayingSong = this._jukebox.current.active;
        if (currentlyPlayingSong) {
            const songDuration = this._jukebox.current.musicDisc.durationSeconds;
            const playingSince = this._jukebox.current.playingSince;

            const playingFor = Math.floor((Date.now() - playingSince) / 1000);
            timeLeft += songDuration - playingFor;
        }

        if (!applicableSongs.length) return [0 + timeLeft, numericalToString(0 + timeLeft)];

        const timeNumerical = applicableSongs.reduce((prev, next) => prev + next) + timeLeft;

        const timeString = numericalToString(timeNumerical);

        return [timeNumerical, timeString];
    }

    private get totalQueueLength(): number {
        if (!this.inventory.length) return 0;
        return this.inventory.map((e) => e.durationSeconds).reduce((prev, next) => prev + next);
    }

    private makeEnqueuedSongEmbed(interaction: GuildedInteraction, discIndex: number): MessageEmbed {
        const disc = this.inventory.at(discIndex);

        if (!disc)
            throw new Error(
                `tried to get non-existent disc at index ${discIndex} (valid indexes 0 to ${
                    this.inventory.length - 1
                })`,
            );

        const timeTillPlay = this.getTimeTillPlay(discIndex + 1);
        const embed = new MessageEmbed()
            .setAuthor({ name: 'Added to Queue', iconURL: interaction.member.displayAvatarURL() })
            .setTitle(disc.title)
            .setURL(disc.url)
            .setThumbnail(disc.thumbnail)
            .setDescription(
                `Duration: ${disc.durationString}\nViews: ${viewCountFormatter(disc.views)}\nChannel: ${disc.channel}`,
            )
            .addField(`Position in Queue: ${discIndex + 1}`, `Time till play: ${timeTillPlay[1]}`)
            .setFooter({
                text: `Queue Length: ${numericalToString(this.totalQueueLength)} (${this.inventory.length} song${
                    this.inventory.length !== 1 ? 's' : ''
                })`,
                iconURL: interaction.guild.iconURL() || DiscImages.Pigstep,
            })
            .setColor(Jukebot.config.colourTheme);

        return embed;
    }

    public makeNowPlayingEmbed(interaction: GuildedInteraction, disc: MusicDisc): MessageEmbed {
        const embed = new MessageEmbed()
            .setAuthor({ name: 'Now Playing', iconURL: disc.addedBy.displayAvatarURL() })
            .setTitle(disc.title)
            .setURL(disc.url)
            .setThumbnail(disc.thumbnail)
            .setDescription(
                `Duration: ${disc.durationString}\nViews: ${viewCountFormatter(disc.views)}\nChannel: ${disc.channel}`,
            )
            .addField('Requested By', `${memberNicknameMention(disc.addedBy.id)} ${moment(disc.addedAt).fromNow()}`)
            .setFooter({
                text: `Queue Length: ${numericalToString(this.totalQueueLength)} (${this.inventory.length} song${
                    this.inventory.length !== 1 ? 's' : ''
                })`,
                iconURL: interaction.guild.iconURL() || DiscImages.Pigstep,
            })
            .setColor(Jukebot.config.colourTheme);

        return embed;
    }
}
