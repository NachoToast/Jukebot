import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, TextChannel } from 'discord.js';
import {
    Spotify,
    SpotifyAlbum,
    SpotifyTrack,
    YouTubePlayList,
    YouTubeVideo,
    is_expired,
    playlist_info,
    refreshToken,
    search,
    spotify,
    video_basic_info,
} from 'play-dl';
import { JukebotGlobals } from '../global';
import { errorMessages } from '../messages/errorMessages';
import { Search } from '../types';
import { awaitOrTimeout, capitalize, withPossiblePlural } from '../util';
import { Hopper } from './Hopper';
import { Jukebox } from './Jukebox';
import { MusicDisc } from './MusicDisc';

interface MultipleRetrievedItems {
    items: MusicDisc[];
    errors: Error[];
    playlist: {
        name: string;
        thumbnail: string;
        size: number;
        url: string;
        createdBy: string;
    };
}

/**
 * Fetches search results for the user.
 *
 * Handles:
 *
 * - Text searches (finds similar-titled YouTube videos).
 * - YouTube video and playlist URLs (direct fetch).
 * - Spotify track, playlist, and album URLs (finds similar YouTube videos based on each track's title and artist(s)).
 */
export class Allay {
    /** Icon to show in search embed footers. */
    private static readonly _icon =
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/45/Allay_JE2.gif/revision/latest';

    /** Icon to show in playlist embeds if they don't have a thumbnail. */
    private static readonly _playlistIcon =
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/0/05/Bookshelf_JE4_BE2.png/revision/latest';

    /** Icon to show in "estimated time" embed footers. */
    private static readonly _clockIcon =
        'https://static.wikia.nocookie.net/minecraft_gamepedia/images/3/3e/Clock_JE3_BE3.gif/revision/latest?cb=20201125194053';

    /** The interaction to pass to any {@link MusicDisc} instances created by this search. */
    private readonly _origin: ChatInputCommandInteraction;

    /** The {@link GuildMember} that did this search. */
    private readonly _member: GuildMember;

    /** The {@link TextChannel} channel that this search was invoked in. */
    private readonly _channel: TextChannel;

    /** The search term given by the member, this can be a URL or just a plaintext search. */
    private readonly _searchTerm: string;

    /** The playback speed given by the member, this can be a number between 0.5 and 2 */
    private readonly _playbackSpeed: number;

    /** If the pitch will change on playback speed */
    private readonly _isPitchChangedOnPlaybackSpeed: boolean;

    /** The source (YouTube, Spotify, text) and type (playlist, video, track, ...) of the given search term. */
    private readonly _search: Search;

    /** Maximum number of results that are allowed to be returned, this is only respected for playlists and albums */
    private readonly _maxResultsAllowed: number;

    public constructor(
        origin: ChatInputCommandInteraction,
        member: GuildMember,
        channel: TextChannel,
        searchTerm: string,
        playbackSpeed: number = 1,
        isPitchChangedOnPlaybackSpeed: boolean = false,
        maxResultsAllowed: number = JukebotGlobals.config.maxQueueSize,
    ) {
        this._origin = origin;
        this._member = member;
        this._channel = channel;
        this._searchTerm = searchTerm;
        this._playbackSpeed = playbackSpeed;
        this._isPitchChangedOnPlaybackSpeed = isPitchChangedOnPlaybackSpeed;
        this._search = Allay.discernSearchSource(searchTerm.toLowerCase());
        this._maxResultsAllowed = maxResultsAllowed;
    }

    public async retrieveItems(): Promise<MusicDisc | MultipleRetrievedItems> {
        if (Allay.isSpotifyExpired()) {
            if (this._search.source === 'spotify') {
                // wait for refresh if we need it
                const didRefresh = await refreshToken();
                if (!didRefresh) throw new Error(errorMessages.failedSpotifyRefresh);
            } else {
                // don't wait for refresh if we don't need it
                refreshToken().catch((e) => {
                    this._origin
                        .followUp({
                            content: errorMessages.failedSpotifyRefreshBackground(e),
                        })
                        .catch(() => console.log(e));
                });
            }
        }

        let fetchPromise: Promise<MusicDisc | MultipleRetrievedItems>;

        switch (this._search.source) {
            case 'youtube':
                switch (this._search.type) {
                    case 'video':
                        fetchPromise = this.handleYouTubeVideoURL();
                        break;
                    case 'playlist':
                        fetchPromise = this.handleYouTubePlaylistURL();
                        break;
                }
                break;
            case 'spotify':
                fetchPromise = this.handleSpotifyURL();
                break;
            case 'text':
                fetchPromise = this.handleTextSearch(this._searchTerm);
                break;
        }

        return await awaitOrTimeout(fetchPromise, JukebotGlobals.config.timeoutThresholds.fetchResults);
    }

    private makeTimeEstimateFooter(embed: EmbedBuilder, jukebox: Jukebox): void {
        const queueDuration = jukebox.upcomingQueue.getDuration();
        const estimate = Hopper.formatDuration(queueDuration + jukebox.getSecondsLeftInCurrentSong());
        const numSongs = jukebox.upcomingQueue.getSize();

        let text = `Estimated time till play: ${estimate}`;
        if (numSongs > 0) {
            text += ` (${withPossiblePlural(numSongs, 'song')})`;
        }

        embed.setFooter({
            text,
            iconURL: Allay._clockIcon,
        });
    }

    /** Makes an "Added to Queue" embed. */
    public makeEmbed(retrievedItems: MusicDisc | MultipleRetrievedItems, jukebox?: Jukebox): EmbedBuilder {
        if (retrievedItems instanceof MusicDisc) return this.makeSingleItemEmbed(retrievedItems, jukebox);
        return this.makeMultipleItemsEmbed(retrievedItems, jukebox);
    }

    private makeSingleItemEmbed(disc: MusicDisc, jukebox?: Jukebox): EmbedBuilder {
        const embed = new EmbedBuilder().setColor(JukebotGlobals.config.embedColour);

        disc.makeFullDescription(embed);

        if (this._search.source === 'spotify') {
            embed.setDescription(embed.data.description! + `\n[View on Spotify](${this._searchTerm})`);
        }

        const niceSearchSource = this._search.source === 'text' ? 'Discord' : capitalize(this._search.source);

        if (jukebox === undefined) {
            embed.setFooter({
                text: `Searched via ${niceSearchSource}`,
                iconURL: Allay._icon,
            });
        } else {
            embed.setAuthor({
                name: `Searched via ${niceSearchSource}`,
                iconURL: Allay._icon,
            });

            this.makeTimeEstimateFooter(embed, jukebox);
        }

        return embed;
    }

    private makeMultipleItemsEmbed(
        { items, errors, playlist }: MultipleRetrievedItems,
        jukebox?: Jukebox,
    ): EmbedBuilder {
        const description = [
            `Fetched ${items.length === playlist.size ? 'all' : `${items.length} /`} ${playlist.size} songs${
                errors.length !== 0 ? ` (${errors.length} errored)` : ''
            }.`,
        ];

        const songSummary: string[] = [];
        let songSummaryLength = 0;
        let numSongsSummarized = 0;

        for (let i = 0, len = Math.min(items.length, 10); i < len; i++) {
            const descLine = items[i].getShortDescription(i + 1);

            if (songSummaryLength + descLine.length + 2 > 1024) break;

            songSummary.push(descLine);
            songSummaryLength += descLine.length + 2;
            numSongsSummarized++;
        }

        if (items.length > numSongsSummarized) {
            songSummary.push(`${items.length - numSongsSummarized} more...`);
        }

        const niceSearchSource = this._search.source === 'text' ? 'Discord' : capitalize(this._search.source);

        const embed = new EmbedBuilder()
            .setTitle(playlist.name)
            .setColor(JukebotGlobals.config.embedColour)
            .setURL(playlist.url)
            .setThumbnail(playlist.thumbnail)
            .setDescription(description.join('\n'))
            .addFields({
                name: 'Songs Preview',
                value: songSummary.join('\n'),
            });

        if (jukebox === undefined) {
            embed.setFooter({
                text: `Searched via ${niceSearchSource}`,
                iconURL: Allay._icon,
            });
        } else {
            embed.setAuthor({
                name: `Searched via ${niceSearchSource}`,
                iconURL: Allay._icon,
            });

            this.makeTimeEstimateFooter(embed, jukebox);
        }

        return embed;
    }

    private async handleSpotifyURL(): Promise<MusicDisc | MultipleRetrievedItems> {
        let spotifyResult: Spotify;

        try {
            spotifyResult = await spotify(this._searchTerm);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.startsWith('Spotify Data is missing'))
                    throw new Error(errorMessages.missingSpotifyData);

                if (error.message.startsWith("Cannot read properties of undefined (reading 'spotify')")) {
                    throw new Error(errorMessages.invalidSpotifyData);
                }

                if (error.message.startsWith('Got 404 from the request')) {
                    throw new Error(errorMessages.spotify404(this._search.type));
                }
            }

            throw error;
        }

        if (Allay.isTrack(spotifyResult)) return await this.handleSpotifyTrack(spotifyResult);

        const allTracks = (await spotifyResult.all_tracks()).slice(0, this._maxResultsAllowed);

        const fetchedTracks = await Promise.all(
            allTracks.map(async (track) => {
                try {
                    const disc = await this.handleSpotifyTrack(track);
                    return disc;
                } catch (error) {
                    return error instanceof Error ? error : new Error(errorMessages.unknownTrackError(track));
                }
            }),
        );

        const items: MusicDisc[] = [];
        const errors: Error[] = [];

        for (const track of fetchedTracks) {
            if (track instanceof MusicDisc) items.push(track);
            else errors.push(track);
        }

        return {
            items,
            errors,
            playlist: {
                name: spotifyResult.name,
                thumbnail: spotifyResult.thumbnail.url,
                size: spotifyResult.tracksCount,
                url: spotifyResult.url ?? this._searchTerm,
                createdBy: Allay.isAlbum(spotifyResult)
                    ? spotifyResult.artists.map((e) => e.name).join(', ')
                    : spotifyResult.owner.name,
            },
        };
    }

    private async handleSpotifyTrack(track: SpotifyTrack): Promise<MusicDisc> {
        const searchTerm = Allay.youtubeSearchEquivalent(track);
        return await this.handleTextSearch(searchTerm);
    }

    private async handleTextSearch(searchTerm: string, limit: number = 3): Promise<MusicDisc> {
        let results = await search(searchTerm, { source: { youtube: 'video' }, limit });

        const searchTermLower = searchTerm.toLowerCase();

        // filter out specific modifiers unless specifically requested
        for (const word of ['hour', 'live', 'sped', 'remix', 'reverb', 'dampening']) {
            if (!searchTermLower.includes(word)) {
                results = results.filter((e) => !e.title?.toLowerCase().includes(word));
            }
        }

        if (results.length === 0) throw new Error(errorMessages.noResultsFound);

        const levenshteinData = results.map((e) => {
            if (e.title === undefined) return 0;

            // some videos are formatted `authorName - songName` and some are `songName - authorName`,
            // this attempts to account for these differences by getting the greatest levenshtein
            // distance out of both the reversed and non-reversed title
            const reversedTitle = e.title.split(' ').reverse().join(' ');
            return Math.max(
                Allay.levenshteinDistance(e.title, searchTerm),
                Allay.levenshteinDistance(reversedTitle, searchTerm),
            );
        });

        let bestResult = results[0];
        let bestResultLevenshtein = levenshteinData[0];

        for (let i = 1, len = results.length; i < len; i++) {
            const levenshtein = levenshteinData[i];

            if (levenshtein > bestResultLevenshtein) {
                bestResult = results[i];
                bestResultLevenshtein = levenshtein;
            }
        }

        if (bestResultLevenshtein < JukebotGlobals.config.levenshteinThreshold) {
            throw new Error(errorMessages.noAcceptableResultsFound);
        }

        return this.handleYouTubeVideo(bestResult);
    }

    private async handleYouTubePlaylistURL(): Promise<MultipleRetrievedItems> {
        let playlist: YouTubePlayList;

        try {
            playlist = await (await playlist_info(this._searchTerm, { incomplete: true })).fetch();
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.startsWith('While getting info from url\nSign in to confirm your age')
            ) {
                throw new Error(errorMessages.missingYouTubeData);
            }

            throw error;
        }

        // clamp max size to configued maximum
        const maxPage = Math.min(Math.ceil(this._maxResultsAllowed / 100), playlist.total_pages);

        // we will overwrite video count later in the method to account for private videos (not done natively)
        playlist.videoCount = 0;

        const videos: YouTubeVideo[] = [];

        for (let page = 1; page <= maxPage; page++) {
            const results = playlist.page(page);
            playlist.videoCount += results.length;
            videos.push(...results);
        }

        const items: MusicDisc[] = [];
        const errors: Error[] = [];

        videos.forEach((video) => {
            try {
                const disc = this.handleYouTubeVideo(video);
                items.push(disc);
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(errorMessages.unknownVideoError(video)));
            }
        });

        return {
            items,
            errors,
            playlist: {
                name: playlist.title ?? 'Unknown Playlist',
                thumbnail: playlist.thumbnail?.url ?? Allay._playlistIcon,
                size: playlist.videoCount,
                url: playlist.url ?? this._searchTerm,
                createdBy: playlist.channel?.name ?? 'Unknown Channel',
            },
        };
    }

    private async handleYouTubeVideoURL(): Promise<MusicDisc> {
        let video: YouTubeVideo;

        try {
            video = (await video_basic_info(this._searchTerm)).video_details;
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.startsWith('While getting info from url\nSign in to confirm your age')
            ) {
                throw new Error(errorMessages.missingYouTubeData);
            }

            throw error;
        }

        return this.handleYouTubeVideo(video);
    }

    private handleYouTubeVideo(video: YouTubeVideo): MusicDisc {
        if (video.private) throw new Error(errorMessages.badVideoPrivate(video));
        if (video.upcoming !== undefined) throw new Error(errorMessages.badVideoUpcoming(video));
        if (video.type !== 'video') throw new Error(errorMessages.badVideoType(video));
        return new MusicDisc(
            this._member,
            this._channel,
            video,
            this._playbackSpeed,
            this._isPitchChangedOnPlaybackSpeed,
        );
    }

    /**
     * Discerns the source and type of a given search term.
     *
     * @example
     * ```ts
     * discernSearchSource('alan walked - faded') // { source: 'text', type: null }
     * discernSearchSource('https://youtube.com/playlist?list=abcdefg') // { source: 'youtube', type: 'playlist' }
     * discernSearchSource('https://youtube.com/watch?v=abcdefg') // { source: 'youtube', type: 'video' }
     * discernSearchSource('https://youtu.be/abcdefg') // { source: 'youtube', type: 'video' }
     * discernSearchSource('https://open.spotify.com/track/abcdefg') // { source: 'spotify', type: 'track' }
     * discernSearchSource('https://open.spotify.com/album/abcdefg') // { source: 'spotify', type: 'album' }
     * discernSearchSource('https://open.spotify.com/playlist/abcdefg') // { source: 'spotify', type: 'playlist' }
     * ```
     *
     * @throws Throws an error if the search term is an invalid or recognized URL.
     */
    private static discernSearchSource(searchTerm: string): Search {
        try {
            const url = new URL(searchTerm);

            if (url.host.match(/^(www\.)?youtube\.com$/g)) {
                if (url.searchParams.has('list')) {
                    // youtube playlist
                    return {
                        source: 'youtube',
                        type: 'playlist',
                    };
                }
                if (url.searchParams.has('v')) {
                    // youtube video
                    return {
                        source: 'youtube',
                        type: 'video',
                    };
                }

                throw new Error('Invalid YouTube URL');
            }

            if (url.host === 'youtu.be') {
                // url-shortened youtube video
                return {
                    source: 'youtube',
                    type: 'video',
                };
            }

            if (url.host === 'open.spotify.com') {
                if (url.pathname.startsWith('/track/')) {
                    // spotify track
                    return {
                        source: 'spotify',
                        type: 'track',
                    };
                }

                if (url.pathname.startsWith('/album/')) {
                    // spotify album
                    return {
                        source: 'spotify',
                        type: 'album',
                    };
                }

                if (url.pathname.startsWith('/playlist/')) {
                    // spotify playlist
                    return {
                        source: 'spotify',
                        type: 'playlist',
                    };
                }

                throw new Error('Invalid Spotify URL');
            }

            throw new Error('Unrecognized URL');
        } catch (error) {
            // url creation error, so probably not a url
            if (searchTerm.startsWith('http') || searchTerm.endsWith('.com')) throw new Error('Invalid URL');

            if (searchTerm.length > 3) {
                return {
                    source: 'text',
                    type: null,
                };
            }

            throw new Error('Invalid search term');
        }
    }

    /**
     * Compares the similarity between 2 strings using Levenshtein distance.
     * @param {string} s1 The first string.
     * @param {string} s2 The second string.
     * @returns {number} Similarity between the 2 strings, between 0.0 (no similarity) and 1.0 (identical).
     */
    private static levenshteinDistance(s1: string, s2: string): number {
        let longerString = s1;
        let shorterString = s2;
        if (s1.length < s2.length) {
            longerString = s2;
            shorterString = s1;
        }
        const longerLength = longerString.length;
        if (longerLength === 0) {
            // both strings are "", so perfect match (1.0)
            return 1.0;
        }

        // standardize edit distance and return
        return (longerLength - this.editDistance(longerString, shorterString)) / longerLength;
    }

    /**
     * A helper function for {@link levenshteinDistance}.
     * @param {string} s1 The longer string.
     * @param {string} s2 The shorter (or equal length) string.
     * @returns {number} The distance (or 'cost') to edit s1 into s2. */
    private static editDistance(s1: string, s2: string): number {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        const costs: number[] = [];

        for (let i = 0, len = s1.length; i <= len; i++) {
            let lastValue = i;

            for (let j = 0, jLen = s2.length; j <= jLen; j++) {
                // since we look at (i - 1) and (j - 1) later,
                // these checks make sure they're both > 0;
                if (i === 0) costs[j] = j;
                else if (j > 0) {
                    let newValue = costs[j - 1];

                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }

            if (i > 0) costs[s2.length] = lastValue;
        }

        return costs[s2.length];
    }

    /**
     * Converts data from a track into a string to search Youtube with.
     *
     * Currently it just does "author names song name ", e.g. "Alan Walker Faded"
     */
    private static youtubeSearchEquivalent({ artists, name }: SpotifyTrack): string {
        return `${artists.map(({ name }) => name).join(' ')} ${name}`;
    }

    private static isTrack(playlist: Spotify): playlist is SpotifyTrack {
        return playlist.type === 'track';
    }

    private static isAlbum(playlist: Spotify): playlist is SpotifyAlbum {
        return playlist.type === 'album';
    }

    private static isSpotifyExpired(): boolean {
        try {
            return is_expired();
        } catch (error) {
            // will error when Spotify is not set up
            return false;
        }
    }
}
