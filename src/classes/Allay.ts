import { ChatInputCommandInteraction } from 'discord.js';
import {
    Spotify,
    SpotifyAlbum,
    SpotifyTrack,
    YouTubeVideo,
    playlist_info,
    search,
    spotify,
    video_basic_info,
} from 'play-dl';
import { JukebotGlobals } from '../global';
import { Search } from '../types';
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
    private readonly _origin: ChatInputCommandInteraction<'cached' | 'raw'>;
    private readonly _searchTerm: string;
    private readonly _search: Search;

    public constructor(origin: ChatInputCommandInteraction<'cached' | 'raw'>, searchTerm: string) {
        this._origin = origin;
        this._searchTerm = searchTerm;
        this._search = Allay.discernSearchSource(searchTerm.toLowerCase());
    }

    public async retrieveItems(): Promise<MusicDisc | MultipleRetrievedItems> {
        let output: MusicDisc | MultipleRetrievedItems;

        switch (this._search.source) {
            case 'youtube':
                switch (this._search.type) {
                    case 'video':
                        output = await this.handleYouTubeVideoURL();
                        break;
                    case 'playlist':
                        output = await this.handleYouTubePlaylistURL();
                        break;
                }
                break;
            case 'spotify':
                output = await this.handleSpotifyURL();
                break;
            case 'text':
                output = await this.handleTextSearch(this._searchTerm);
                break;
        }

        return output;
    }

    private async handleSpotifyURL(): Promise<MusicDisc | MultipleRetrievedItems> {
        const spotifyResult = await spotify(this._searchTerm);

        const isTrack = ((playlist: Spotify): playlist is SpotifyTrack => playlist.type === 'track')(spotifyResult);
        const isAlbum = ((playlist: Spotify): playlist is SpotifyAlbum => playlist.type === 'album')(spotifyResult);

        if (isTrack) return await this.handleSpotifyTrack(spotifyResult);

        const items: MusicDisc[] = [];
        const errors: Error[] = [];

        const allTracks = await spotifyResult.all_tracks();

        for (const track of allTracks.splice(0, JukebotGlobals.config.maxQueueSize)) {
            try {
                const disc = await this.handleSpotifyTrack(track);
                items.push(disc);
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(`Unknown error with track <${track.url}>`));
            }
        }

        return {
            items,
            errors,
            playlist: {
                name: spotifyResult.name,
                thumbnail: spotifyResult.thumbnail.url,
                size: spotifyResult.tracksCount,
                url: spotifyResult.url ?? this._searchTerm,
                createdBy: isAlbum ? spotifyResult.artists.map((e) => e.name).join(', ') : spotifyResult.owner.name,
            },
        };
    }

    private async handleSpotifyTrack(track: SpotifyTrack): Promise<MusicDisc> {
        const searchTerm = Allay.youtubeSearchEquivalent(track);
        return await this.handleTextSearch(searchTerm);
    }

    private async handleTextSearch(searchTerm: string, limit: number = 3): Promise<MusicDisc> {
        let results = await search(searchTerm, { source: { youtube: 'video' }, limit });

        // filter out results like [1 HOUR] unless specifically requested
        if (!searchTerm.toLowerCase().includes('hour')) {
            results = results.filter((e) => !e.title?.toLowerCase().includes('hour'));
        }

        if (results.length === 0) throw new Error('No results found');

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
            throw new Error(
                `No results found with acceptable similarity (above ${JukebotGlobals.config.levenshteinThreshold})`,
            );
        }

        return this.handleYouTubeVideo(bestResult);
    }

    private async handleYouTubePlaylistURL(): Promise<MultipleRetrievedItems> {
        const playlist = await (await playlist_info(this._searchTerm, { incomplete: true })).fetch();

        // clamp max size to configued maximum
        const maxPage =
            JukebotGlobals.config.maxQueueSize === undefined
                ? playlist.total_pages
                : Math.min(Math.ceil(JukebotGlobals.config.maxQueueSize / 100), playlist.total_pages);

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
                errors.push(error instanceof Error ? error : new Error(`Unknown error with video <${video.url}>`));
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
        const video = (await video_basic_info(this._searchTerm)).video_details;
        return this.handleYouTubeVideo(video);
    }

    private handleYouTubeVideo(video: YouTubeVideo): MusicDisc {
        if (video.private) throw new Error(`Cannot queue a private video (<${video.url}>)`);
        if (video.upcoming !== undefined) throw new Error(`Cannot queue an upcoming video (<${video.url}>)`);
        if (video.type !== 'video') throw new Error(`<${video.url}> is not a video`);
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
}
