import { GuildedInteraction } from '../types/Interactions';
import { MusicDisc } from './MusicDisc';
import {
    getSearchType,
    SearchType,
    SpotifyAlbumURL,
    SpotifyPlaylistURL,
    SpotifyTrackURL,
    SpotifyURLSubtypes,
    ValidTextSearch,
    YouTubePlaylistURL,
    YouTubeURLSubtypes,
    YouTubeVideoURL,
} from '../helpers/searchType';
import {
    is_expired,
    playlist_info,
    refreshToken,
    search,
    spotify,
    SpotifyAlbum,
    SpotifyPlaylist,
    SpotifyTrack,
    video_basic_info,
    YouTubeVideo,
} from 'play-dl';
import { levenshteinDistance } from '../helpers/levenshtein';
import { Jukebot } from './Client';
import { chooseRandomDisc } from '../helpers/chooseRandomDisc';

interface ConversionInfo {
    originalName: string;
    youtubeEquivalent: string | null;
    levenshtein: number | null;
}

interface BaseResponse {
    searchType: SearchType;
    valid: boolean;
}

/** The search was invalid because the given URL or search term was invalid. */
interface InvalidResponse extends BaseResponse {
    searchType: SearchType & { valid: false };
    valid: false;
}

interface ValidResponse extends BaseResponse {
    searchType: SearchType & { valid: true };
    success: boolean;
    valid: true;
}

/** The search could not be completed due to unexpected errors. */
interface ErrorResponse extends ValidResponse {
    success: false;
    errorMessages: string[];
}

interface NonErrorResponse extends ValidResponse {
    success: true;
    type: 'single' | 'multiple';
    items: MusicDisc[];
}

/** The search resulted in a single item being added. */
interface BaseSingleResponse extends NonErrorResponse {
    searchType: SpotifyTrackURL | SpotifyAlbumURL | YouTubeVideoURL | ValidTextSearch;
    type: 'single';
}

interface SingleYouTubeResponse extends BaseSingleResponse {
    searchType: YouTubeVideoURL;
}

interface SingleNonYouTubeResponse extends BaseSingleResponse {
    searchType: SpotifyTrackURL | SpotifyAlbumURL | ValidTextSearch;
    conversionInfo: ConversionInfo;
}

/** Metadata given when searching for multiple items. */
interface BaseMultiResponse extends NonErrorResponse {
    searchType: SpotifyPlaylistURL | SpotifyAlbumURL | YouTubePlaylistURL;
    playlistName: string;
    playlistImageURL: string;
    playlistSize: number;
    source: 'youtube' | 'spotify';
}

interface MultiYouTubeResponse extends BaseMultiResponse {
    searchType: YouTubePlaylistURL;
    source: 'youtube';
}

interface MultiNonYouTubeResponse extends BaseMultiResponse {
    searchType: SpotifyPlaylistURL | SpotifyAlbumURL;
    conversionInfo: ConversionInfo[];
    source: 'spotify';
}

type SingleResponse = SingleYouTubeResponse | SingleNonYouTubeResponse;
type MultiResponse = MultiYouTubeResponse | MultiNonYouTubeResponse;

type ValidAddResponse = SingleResponse | MultiResponse | ErrorResponse;
type AddResponse = ValidAddResponse | InvalidResponse;

/** Hopper instances handle the storing and serving of `MusicDiscs` to a `Jukeblock`. */
export abstract class Hopper {
    /** Attempts to find the relevant media from a search term.
     *
     * @param {GuildedInteraction} interaction - The interaction,
     * must have a `song` option specified.
     *
     * @returns {Promise<AddResponse>} - A list of items added and metadata.
     *
     * @throws Throws a {@link TypeError} if the provided interaction doesn't have
     *  (or has an invalid) `song` option.
     */
    public static async add(interaction: GuildedInteraction): Promise<AddResponse> {
        let queryString: unknown;
        try {
            queryString = interaction.options.get('song', true).value;
            if (typeof queryString !== 'string') throw new TypeError();
            if (queryString.length < 3) throw new TypeError();
        } catch (error) {
            return {
                valid: false,
                searchType: { valid: false, type: 'textSearch' },
            };
        }

        const searchType = getSearchType(queryString);
        if (!searchType.valid) return { searchType, valid: false };

        switch (searchType.type) {
            case 'youtube': {
                return await this.handleYouTubeURL(interaction, queryString, searchType.subtype);
            }
            case 'spotify':
                return await this.handleSpotifyURL(interaction, queryString, searchType.subtype);
            case 'textSearch': {
                const { items, conversionInfo } = await this.handleTextSearch(interaction, [queryString]);
                const response: SingleNonYouTubeResponse = {
                    valid: true,
                    searchType,
                    success: true,
                    type: 'single',
                    items,
                    conversionInfo: conversionInfo[0],
                };
                return response;
            }
        }
    }

    private static async handleYouTubeURL(
        interaction: GuildedInteraction,
        url: string,
        subtype: YouTubeURLSubtypes,
    ): Promise<ValidAddResponse> {
        switch (subtype) {
            case YouTubeURLSubtypes.Video:
                return await Hopper.handleYouTubeVideoURL(interaction, url);
            case YouTubeURLSubtypes.Playlist:
                return await Hopper.handleYouTubePlaylistURL(interaction, url);
        }
    }

    private static async handleSpotifyURL(
        interaction: GuildedInteraction,
        url: string,
        subtype: SpotifyURLSubtypes,
    ): Promise<ValidAddResponse | ErrorResponse> {
        if (is_expired()) await refreshToken();

        try {
            const res = await spotify(url);
            switch (res.type) {
                case 'album':
                    return await Hopper.handleSpotifyAlbum(interaction, res as SpotifyAlbum);
                case 'playlist':
                    return await Hopper.handleSpotifyPlaylist(interaction, res as SpotifyPlaylist);
                case 'track':
                    return await Hopper.handleSpotifyTrack(interaction, res as SpotifyTrack);
            }
        } catch (error) {
            return {
                valid: true,
                searchType: { valid: true, type: 'spotify', subtype },
                success: false,
                errorMessages: [`Error getting Spotify url <${url}>`],
            };
        }
    }

    /** Converts an array of
     * {@link YouTubeVideo youtube videos}
     * into a set of {@link MusicDisc music discs}.
     *
     * Notably will filter out "invalid" videos, such as videos that are:
     * - Private
     * - Upcoming (Premieres)
     * - Live
     *
     */
    private static handleYouTubeVideo(interaction: GuildedInteraction, videos: YouTubeVideo[]): MusicDisc[] {
        const output: MusicDisc[] = [];

        videos.forEach((video) => {
            if (video.private || video.upcoming || video.live || video.type !== 'video') return;

            output.push(new MusicDisc(interaction, video));
        });

        return output;
    }

    private static async handleYouTubeVideoURL(
        interaction: GuildedInteraction,
        url: string,
    ): Promise<SingleYouTubeResponse | ErrorResponse> {
        const searchType: YouTubeVideoURL = { valid: true, type: 'youtube', subtype: YouTubeURLSubtypes.Video };
        try {
            const video = (await video_basic_info(url)).video_details;
            const items = Hopper.handleYouTubeVideo(interaction, [video]);
            return { valid: true, searchType, success: true, type: 'single', items };
        } catch (error) {
            console.log(error);
            return {
                valid: true,
                searchType,
                success: false,
                errorMessages: [`Error getting video from YouTube video <${url}>`],
            };
        }
    }

    private static async handleYouTubePlaylistURL(
        interaction: GuildedInteraction,
        url: string,
    ): Promise<MultiYouTubeResponse | ErrorResponse> {
        const searchType: YouTubePlaylistURL = { valid: true, type: 'youtube', subtype: YouTubeURLSubtypes.Playlist };
        try {
            const playlist = await playlist_info(url, { incomplete: true });
            const videos = (await playlist.all_videos()).slice(0, Jukebot.config.maxQueueSize);
            const items = Hopper.handleYouTubeVideo(interaction, videos);
            return {
                valid: true,
                searchType,
                success: true,
                type: 'multiple',
                items,
                playlistName: playlist.title || 'Unknown Playlist',
                playlistImageURL: playlist.thumbnail?.url || chooseRandomDisc(),
                playlistSize: playlist.videoCount ?? 0,
                source: 'youtube',
            };
        } catch (error) {
            console.log(error);
            return {
                valid: true,
                searchType,
                success: false,
                errorMessages: [`Error getting videos from YouTube playlist <${url}>`],
            };
        }
    }

    private static async handleTextSearch(
        interaction: GuildedInteraction,
        searchStrings: string[],
    ): Promise<{ conversionInfo: ConversionInfo[]; items: MusicDisc[] }> {
        const rawResults = (
            await Promise.all(
                searchStrings.map((searchString) =>
                    search(searchString, { source: { youtube: 'video' }, fuzzy: true, limit: 1 }).catch(
                        () => undefined,
                    ),
                ),
            )
        )
            // each search returns an array of videos, but we only want the first result
            // `limit: 1` means we should at max have 1 result per search string anyway
            .map((results) => results?.at(0));

        const items: MusicDisc[] = [];
        const conversionInfo: ConversionInfo[] = [];

        for (let i = 0, len = searchStrings.length; i < len; i++) {
            const originalName = searchStrings[i];
            const video = rawResults[i];
            if (!video) {
                conversionInfo.push({ originalName, youtubeEquivalent: null, levenshtein: null });
                continue;
            }
            const youtubeEquivalent = video?.title ?? '';
            const similarity = levenshteinDistance(youtubeEquivalent, searchStrings[i]);
            conversionInfo.push({ originalName, youtubeEquivalent, levenshtein: similarity });

            if (similarity < Jukebot.config.levenshteinThreshold) continue;

            items.push(...Hopper.handleYouTubeVideo(interaction, [video]));
        }

        return { conversionInfo, items };
    }

    private static async handleSpotifyAlbum(
        interaction: GuildedInteraction,
        album: SpotifyAlbum,
    ): Promise<MultiNonYouTubeResponse | ErrorResponse> {
        const searchType: SpotifyAlbumURL = { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Album };
        try {
            const songNames = (await album.all_tracks()).slice(0, Jukebot.config.maxQueueSize).map(({ name }) => name);
            const { conversionInfo, items } = await Hopper.handleTextSearch(interaction, songNames);
            return {
                valid: true,
                searchType,
                success: true,
                type: 'multiple',
                items,
                playlistName: album.name,
                playlistImageURL: album.thumbnail.url,
                conversionInfo,
                playlistSize: album.tracksCount,
                source: 'spotify',
            };
        } catch (error) {
            console.log(error);
            return {
                valid: true,
                searchType,
                success: false,
                errorMessages: [`Error getting videos from Spotify album <${album.url}>`],
            };
        }
    }

    private static async handleSpotifyPlaylist(
        interaction: GuildedInteraction,
        playlist: SpotifyPlaylist,
    ): Promise<MultiNonYouTubeResponse | ErrorResponse> {
        const searchType: SpotifyPlaylistURL = { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Playlist };
        try {
            const songNames = (await playlist.all_tracks())
                .slice(0, Jukebot.config.maxQueueSize)
                .map(({ name }) => name);
            const { conversionInfo, items } = await Hopper.handleTextSearch(interaction, songNames);
            return {
                valid: true,
                searchType,
                success: true,
                type: 'multiple',
                items,
                playlistName: playlist.name,
                playlistImageURL: playlist.thumbnail.url,
                conversionInfo,
                playlistSize: playlist.tracksCount,
                source: 'spotify',
            };
        } catch (error) {
            console.log(error);
            return {
                valid: true,
                searchType,
                success: false,
                errorMessages: [`Error getting videos from Spotify playlist <${playlist.url}>`],
            };
        }
    }

    private static async handleSpotifyTrack(
        interaction: GuildedInteraction,
        track: SpotifyTrack,
    ): Promise<SingleNonYouTubeResponse | ErrorResponse> {
        const searchType: SpotifyTrackURL = { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Track };
        try {
            const { conversionInfo, items } = await Hopper.handleTextSearch(interaction, [track.name]);
            return {
                valid: true,
                searchType,
                success: true,
                type: 'single',
                items,
                conversionInfo: conversionInfo[0],
            };
        } catch (error) {
            console.log(error);
            return {
                valid: true,
                searchType,
                success: false,
                errorMessages: [`Error getting Spotify track <${track.url}>`],
            };
        }
    }

    /** Gets the total length of all added items in secons. */
    private static getTotalLength(items: MusicDisc[]): number {
        let totalDuration = 0;
        for (const item of items) {
            totalDuration += item.durationSeconds;
        }
        return totalDuration;
    }
}
