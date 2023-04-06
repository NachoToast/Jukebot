import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
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
import { timeoutMessages } from '../messages';
import { errorMessages } from '../messages/errorMessages';
import { Search } from '../types';
import { awaitOrTimeout } from '../util';
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

/** Fetches search results for the user. */
export class Allay {
    private readonly _origin: ChatInputCommandInteraction;
    private readonly _member: GuildMember;
    private readonly _searchTerm: string;
    private readonly _search: Search;
    private readonly _maxResultsAllowed: number;

    public constructor(
        origin: ChatInputCommandInteraction,
        member: GuildMember,
        searchTerm: string,
        maxResultsAllowed: number = JukebotGlobals.config.maxQueueSize,
    ) {
        this._origin = origin;
        this._member = member;
        this._searchTerm = searchTerm;
        this._search = Allay.discernSearchSource(searchTerm.toLowerCase());
        this._maxResultsAllowed = maxResultsAllowed;
    }

    public async retrieveItems(): Promise<MusicDisc | MultipleRetrievedItems> {
        if (Allay.isExpired()) {
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
                        .catch(() => null);
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

        return await awaitOrTimeout(
            fetchPromise,
            JukebotGlobals.config.timeoutThresholds.fetchResults,
            timeoutMessages.searchTimeout(this._search.source, this._searchTerm),
        );
    }

    /** Makes an "Added to Queue" embed. */
    public makeEmbed(retrievedItems: MusicDisc | MultipleRetrievedItems): EmbedBuilder {
        if (retrievedItems instanceof MusicDisc) return this.makeSingleItemEmbed(retrievedItems);
        return this.makeMultipleItemsEmbed(retrievedItems);
    }

    private makeSingleItemEmbed(disc: MusicDisc): EmbedBuilder {
        const { views, channel, title, url, thumbnail } = disc;

        const description = [`Duration: ${disc.durationString}`];

        if (views !== 0) description.push(`Views: ${Intl.NumberFormat('en', { notation: 'compact' }).format(views)}`);
        description.push(`Channel: ${channel}`);

        if (this._search.source === 'spotify') {
            description.push(`[View on Spotify](${this._searchTerm})`);
        }

        const niceSearchSource =
            this._search.source === 'text'
                ? 'Discord'
                : this._search.source[0].toUpperCase() + this._search.source.slice(1);

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(JukebotGlobals.config.embedColour)
            .setURL(url)
            .setThumbnail(thumbnail)
            .setDescription(description.join('\n'))
            .setFooter({
                text: `Searched via ${niceSearchSource}`,
                iconURL: this._member.displayAvatarURL(),
            });

        return embed;
    }

    private makeMultipleItemsEmbed({ items, errors, playlist }: MultipleRetrievedItems): EmbedBuilder {
        const songSummary: string[] = [];

        const description = [
            `Fetched ${items.length === playlist.size ? 'all' : `${items.length} /`} ${playlist.size} songs${
                errors.length !== 0 ? ` (${errors.length} errored)` : ''
            }.`,
        ];

        for (let i = 0, len = Math.min(items.length, 10); i < len; i++) {
            const { title, durationString, url } = items[i];
            songSummary.push(`${i + 1}. [${title}](${url}) (${durationString})`);
        }

        if (items.length > 10) {
            songSummary.push(`${items.length - 10} more...`);
        }

        const niceSearchSource =
            this._search.source === 'text'
                ? 'Discord'
                : this._search.source[0].toUpperCase() + this._search.source.slice(1);

        const embed = new EmbedBuilder()
            .setTitle(playlist.name)
            .setColor(JukebotGlobals.config.embedColour)
            .setURL(playlist.url)
            .setThumbnail(playlist.thumbnail)
            .setDescription(description.join('\n'))
            .setFooter({
                text: `Searched via ${niceSearchSource}`,
                iconURL: this._member.displayAvatarURL(),
            })
            .addFields({
                name: 'Songs Preview',
                value: songSummary.join('\n'),
            });

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

        const items: MusicDisc[] = [];
        const errors: Error[] = [];

        const allTracks = (await spotifyResult.all_tracks()).slice(0, this._maxResultsAllowed);

        await Promise.all(
            allTracks.map(async (track) => {
                try {
                    const disc = await this.handleSpotifyTrack(track);
                    items.push(disc);
                } catch (error) {
                    errors.push(error instanceof Error ? error : new Error(errorMessages.unknownTrackError(track)));
                }
            }),
        );

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

        const highestSimilarity = Math.max(...levenshteinData);
        const bestIndex = levenshteinData.indexOf(highestSimilarity);
        const bestResult = results[bestIndex];

        if (highestSimilarity < JukebotGlobals.config.levenshteinThreshold) {
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
                thumbnail: playlist.thumbnail?.url ?? MusicDisc.chooseRandomDiscThumbnail(),
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
        return new MusicDisc(this._origin, video);
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
                if (i == 0) costs[j] = j;
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

    private static isExpired(): boolean {
        try {
            return is_expired();
        } catch (error) {
            // will error when Spotify is not set up
            return false;
        }
    }
}
