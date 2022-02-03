import { GuildedInteraction } from '../types/Interactions';
import { MusicDisc } from './MusicDisc';
import {
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
    searchType: SearchType & { valid: true };
    success: boolean;
}

/** The search could not be completed due to unexpected errors. */
interface ErrorResponse extends BaseResponse {
    success: false;
    errorMessage: string;
}

interface NonErrorResponse extends BaseResponse {
    success: true;
}

/** The search resulted in a single item being added. */
interface BaseSingleResponse extends NonErrorResponse {
    type: 'single';
    items: MusicDisc;
}

interface SingleYouTubeResponse extends BaseSingleResponse {
    searchType: YouTubeVideoURL;
    source: 'youtube';
}

export interface SingleNonYouTubeResponse extends BaseSingleResponse {
    searchType: SpotifyTrackURL | SpotifyAlbumURL | ValidTextSearch;
    conversionInfo: ConversionInfo;
    source: 'nonYouTube';
}

/** Metadata given when searching for multiple items. */
interface BaseMultiResponse extends NonErrorResponse {
    playlistName: string;
    playlistImageURL: string;
    playlistSize: number;
    playlistURL: string;
    items: MusicDisc[];
    type: 'multiple';
    createdBy: string[];
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

export type AddResponse = SingleResponse | MultiResponse | ErrorResponse;

/** Hopper instances handle the storing and serving of `MusicDiscs` to a `Jukeblock`. */
class Hopper {
    /** Attempts to find the relevant media from a search term.
     *
     * @param {GuildedInteraction} interaction - The interaction,
     * must have a `song` option specified.
     *
     * @returns {Promise<AddResponse>} - A list of items added and metadata.
     *
     */
    public async add(
        interaction: GuildedInteraction,
        queryString: string,
        queryType: SearchType & { valid: true },
    ): Promise<AddResponse> {
        switch (queryType.type) {
            case 'youtube': {
                return await this.handleYouTubeURL(interaction, queryString, queryType.subtype);
            }
            case 'spotify':
                return await this.handleSpotifyURL(interaction, queryString, queryType.subtype);
            case 'textSearch': {
                const { items, conversionInfo } = await this.handleTextSearch(interaction, [queryString]);
                const response: SingleNonYouTubeResponse = {
                    searchType: queryType,
                    source: 'nonYouTube',
                    success: true,
                    type: 'single',
                    items: items[0],
                    conversionInfo: conversionInfo[0],
                };
                return response;
            }
        }
    }

    private async handleYouTubeURL(
        interaction: GuildedInteraction,
        url: string,
        subtype: YouTubeURLSubtypes,
    ): Promise<AddResponse> {
        switch (subtype) {
            case YouTubeURLSubtypes.Video:
                return await this.handleYouTubeVideoURL(interaction, url);
            case YouTubeURLSubtypes.Playlist:
                return await this.handleYouTubePlaylistURL(interaction, url);
        }
    }

    private async handleSpotifyURL(
        interaction: GuildedInteraction,
        url: string,
        subtype: SpotifyURLSubtypes,
    ): Promise<AddResponse | ErrorResponse> {
        if (is_expired()) await refreshToken();

        try {
            const res = await spotify(url);
            switch (res.type) {
                case 'album':
                    return await this.handleSpotifyAlbum(interaction, res as SpotifyAlbum);
                case 'playlist':
                    return await this.handleSpotifyPlaylist(interaction, res as SpotifyPlaylist);
                case 'track': {
                    return await this.handleSpotifyTrack(interaction, res as SpotifyTrack);
                }
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? `Error getting Spotify URL: ${error.name}\n${error.message}`
                    : 'Unknown error getting Spotify URL';
            return {
                searchType: { valid: true, type: 'spotify', subtype },
                success: false,
                errorMessage,
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
    private handleYouTubeVideo(interaction: GuildedInteraction, videos: YouTubeVideo[]): MusicDisc[] {
        const output: MusicDisc[] = [];

        videos.forEach((video) => {
            if (video.private || video.upcoming || video.live || video.type !== 'video') return;

            output.push(new MusicDisc(interaction, video));
        });

        return output;
    }

    private async handleYouTubeVideoURL(
        interaction: GuildedInteraction,
        url: string,
    ): Promise<SingleYouTubeResponse | ErrorResponse> {
        const searchType: YouTubeVideoURL = { valid: true, type: 'youtube', subtype: YouTubeURLSubtypes.Video };
        try {
            const video = (await video_basic_info(url)).video_details;
            const items = this.handleYouTubeVideo(interaction, [video]);
            return { searchType, source: 'youtube', success: true, type: 'single', items: items[0] };
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? `Error getting YouTube video: ${error.name}\n${error.message}`
                    : 'Unknown error getting YouTube video';
            return {
                searchType,
                success: false,
                errorMessage,
            };
        }
    }

    private async handleYouTubePlaylistURL(
        interaction: GuildedInteraction,
        url: string,
    ): Promise<MultiYouTubeResponse | ErrorResponse> {
        const searchType: YouTubePlaylistURL = { valid: true, type: 'youtube', subtype: YouTubeURLSubtypes.Playlist };
        try {
            const playlist = await playlist_info(url, { incomplete: true });
            const videos = (await playlist.all_videos()).slice(0, Jukebot.config.maxQueueSize);
            const items = this.handleYouTubeVideo(interaction, videos);
            return {
                searchType,
                success: true,
                type: 'multiple',
                items,
                playlistName: playlist.title || 'Unknown Playlist',
                playlistImageURL: playlist.thumbnail?.url || chooseRandomDisc(),
                playlistSize: playlist.videoCount ?? 0,
                source: 'youtube',
                playlistURL: playlist.url || url,
                createdBy: [playlist.channel?.name ?? 'Unknown Channel'],
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? `Error getting videos from YouTube playlist: ${error.name}\n${error.message}`
                    : 'Unknown error getting videos from YouTbue playlist';
            return {
                searchType,
                success: false,
                errorMessage,
            };
        }
    }

    private async handleTextSearch(
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

            items.push(...this.handleYouTubeVideo(interaction, [video]));
        }

        return { conversionInfo, items };
    }

    private async handleSpotifyAlbum(
        interaction: GuildedInteraction,
        album: SpotifyAlbum,
    ): Promise<MultiNonYouTubeResponse | ErrorResponse> {
        const searchType: SpotifyAlbumURL = { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Album };
        try {
            const songNames = (await album.all_tracks())
                .slice(0, Jukebot.config.maxQueueSize)
                .map((track) => Hopper.trackToYouTubeSearch(track));
            const { conversionInfo, items } = await this.handleTextSearch(interaction, songNames);
            return {
                searchType,
                success: true,
                type: 'multiple',
                items,
                playlistName: album.name,
                playlistImageURL: album.thumbnail.url,
                conversionInfo,
                playlistSize: album.tracksCount,
                source: 'spotify',
                playlistURL: album.url,
                createdBy: album.artists.map(({ name }) => name),
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? `Error getting tracks from Spotify album: ${error.name}\n${error.message}`
                    : 'Unknown error getting tracks from Spotify album';
            return {
                searchType,
                success: false,
                errorMessage,
            };
        }
    }

    private async handleSpotifyPlaylist(
        interaction: GuildedInteraction,
        playlist: SpotifyPlaylist,
    ): Promise<MultiNonYouTubeResponse | ErrorResponse> {
        const searchType: SpotifyPlaylistURL = { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Playlist };
        try {
            const songNames = (await playlist.all_tracks())
                .slice(0, Jukebot.config.maxQueueSize)
                .map((track) => Hopper.trackToYouTubeSearch(track));
            const { conversionInfo, items } = await this.handleTextSearch(interaction, songNames);
            return {
                searchType,
                success: true,
                type: 'multiple',
                items,
                playlistName: playlist.name,
                playlistImageURL: playlist.thumbnail.url,
                conversionInfo,
                playlistSize: playlist.tracksCount,
                source: 'spotify',
                playlistURL: playlist.url,
                createdBy: playlist.collaborative ? [playlist.owner.name, 'others'] : [playlist.owner.name],
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? `Error getting tracks from Spotify playlist: ${error.name}\n${error.message}`
                    : 'Unknown error getting tracks from Spotify playlist';
            return {
                searchType,
                success: false,
                errorMessage,
            };
        }
    }

    private async handleSpotifyTrack(
        interaction: GuildedInteraction,
        track: SpotifyTrack,
    ): Promise<SingleNonYouTubeResponse | ErrorResponse> {
        const searchType: SpotifyTrackURL = { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Track };
        try {
            const { conversionInfo, items } = await this.handleTextSearch(interaction, [
                Hopper.trackToYouTubeSearch(track),
            ]);
            return {
                searchType,
                success: true,
                type: 'single',
                items: items[0],
                conversionInfo: conversionInfo[0],
                source: 'nonYouTube',
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? `Error getting Spotify track: ${error.name}\n${error.message}`
                    : 'Unknown error getting Spotify track';
            return {
                searchType,
                success: false,
                errorMessage,
            };
        }
    }

    /** Converts data from a track into a string to search Youtube with.
     *
     * Currently it just does "author names song name", e.g.
     * "Alan Walker Faded"
     */
    private static trackToYouTubeSearch({ artists, name }: SpotifyTrack): string {
        return `${artists.map(({ name }) => name).join(' ')} ${name}`;
    }
}

export default new Hopper();
