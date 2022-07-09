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
import { Config } from '../../Config';
import { chooseRandomDisc } from '../../functions/chooseRandomDisc';
import { levenshteinDistance } from '../../functions/levenshtein';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import {
    SearchSources,
    SpotifySubtypes,
    ValidSearch,
    ValidSpotifySearch,
    ValidYouTubeSearch,
    YouTubeSubtypes,
} from '../../types/SearchTypes';
import { MusicDisc } from '../MusicDisc';
import { Logger } from '../template/Logger';
import {
    BrokenReasons,
    ConversionHopperError,
    HopperError,
    NoResultsHopperError,
    VideoHopperError,
} from './HopperError';
import { HandleTextSearchResponse, HopperResult } from './HopperTypes';

/** Handles fetching of results from a query string. */
export class Hopper<T extends ValidSearch> {
    public readonly interaction: JukebotInteraction;
    public readonly search: T;
    public readonly searchTerm: string;
    public readonly maxItems: number;
    public readonly logger?: Logger;

    public constructor(
        interaction: JukebotInteraction,
        search: T,
        searchTerm: string,
        maxItems: number,
        logger?: Logger,
    ) {
        this.interaction = interaction;
        this.search = search;
        this.searchTerm = searchTerm;
        this.maxItems = maxItems;
        this.logger = logger;
    }

    public async fetchResults(): Promise<HopperResult<T>> {
        if (is_expired()) await refreshToken();

        let output: HopperResult<ValidSearch>;
        let logOutput = false;

        switch (this.search.source) {
            case SearchSources.YouTube:
                switch (this.search.type) {
                    case YouTubeSubtypes.Playlist:
                        output = await this.handleYouTubePlaylistURL(this.searchTerm);
                        break;
                    case YouTubeSubtypes.Video:
                        output = await this.handleYouTubeVideoURL(this.searchTerm);
                        break;
                    default:
                        output = { success: false, error: `Unrecognized YouTube search type - \`${this.searchTerm}\`` };
                        logOutput = true;
                        break;
                }
                break;
            case SearchSources.Spotify:
                switch (this.search.type) {
                    case SpotifySubtypes.Album:
                        output = await this.handleSpotifyAlbumURL(this.searchTerm);
                        break;
                    case SpotifySubtypes.Playlist:
                        output = await this.handleSpotifyPlaylistURL(this.searchTerm);
                        break;
                    case SpotifySubtypes.Track:
                        output = await this.handleSpotifyTrackURL(this.searchTerm);
                        break;
                    default:
                        output = { success: false, error: `Unrecognized Spotify search type - \`${this.searchTerm}\`` };
                        logOutput = true;
                        break;
                }
                break;
            case SearchSources.Text: {
                const video = await this.handleTextSearch(this.searchTerm, null);
                if (video instanceof HopperError) {
                    output = { success: true, items: [], errors: [video], playlistMetadata: undefined };
                } else {
                    const disc = this.handleYouTubeVideo(video);
                    if (disc instanceof MusicDisc) {
                        output = { success: true, items: [disc], errors: [], playlistMetadata: undefined };
                    } else {
                        output = { success: true, items: [], errors: [disc], playlistMetadata: undefined };
                    }
                }
                break;
            }
            default:
                output = {
                    success: false,
                    error: `Unrecognized search query - \`${this.searchTerm}\``,
                };
                logOutput = true;
                break;
        }

        if (logOutput) {
            this.logger?.log(`Got call to log output`, {
                output,
                interaction: this.interaction,
                searchTerm: this.searchTerm,
                search: this.search,
            });
        }

        return output;
    }

    /** Tries to convert a YouTube video to a MusicDisc. */
    private handleYouTubeVideo(video: YouTubeVideo): MusicDisc | VideoHopperError<BrokenReasons> {
        if (video.private) return new VideoHopperError(video, BrokenReasons.Private, undefined);
        if (video.upcoming) return new VideoHopperError(video, BrokenReasons.Upcoming, undefined);
        if (video.live) return new VideoHopperError(video, BrokenReasons.Live, undefined);
        if (video.type !== `video`) return new VideoHopperError(video, BrokenReasons.NotAVideo, undefined);
        try {
            return new MusicDisc(this.interaction, video);
        } catch (error) {
            if (error instanceof Error) {
                return new VideoHopperError(video, BrokenReasons.Other, `[${error.name}] ${error.message}`);
            } else {
                this.logger?.log(error);
                return new VideoHopperError(video, BrokenReasons.Other, `Unknown error occurred`);
            }
        }
    }

    private async handleYouTubeVideoURL(url: string): Promise<HopperResult<ValidYouTubeSearch<YouTubeSubtypes.Video>>> {
        try {
            const { video_details } = await video_basic_info(url);
            const video = this.handleYouTubeVideo(video_details);

            const response: HopperResult<ValidYouTubeSearch<YouTubeSubtypes.Video>> = {
                success: true,
                items: [],
                errors: [],
                playlistMetadata: undefined,
            };
            if (video instanceof MusicDisc) {
                response.items = [video];
            } else {
                response.errors = [video];
            }

            return response;
        } catch (error) {
            return { success: false, error };
        }
    }

    private async handleYouTubePlaylistURL(
        url: string,
    ): Promise<HopperResult<ValidYouTubeSearch<YouTubeSubtypes.Playlist>>> {
        try {
            const playlist = await playlist_info(url, { incomplete: true });
            const videos = await playlist.next(this.maxItems);

            const items: MusicDisc[] = [];
            const errors: (HopperError<SearchSources.YouTube> | VideoHopperError<BrokenReasons>)[] = [];

            videos.forEach((video) => {
                const disc = this.handleYouTubeVideo(video);
                if (disc instanceof MusicDisc) {
                    items.push(disc);
                } else {
                    errors.push(disc);
                }
            });

            return {
                success: true,
                items,
                errors,
                playlistMetadata: {
                    playlistName: playlist.title ?? `Unknown Playlist`,
                    playlistImageURL: playlist.thumbnail?.url || chooseRandomDisc(),
                    playlistSize: playlist.videoCount ?? 0,
                    playlistURL: playlist.url || url,
                    createdBy: playlist.channel?.name ?? `Unknown Channel`,
                },
            };
        } catch (error) {
            return {
                success: false,
                error,
            };
        }
    }

    private async handleSpotifyTrackURL(url: string): Promise<HopperResult<ValidSpotifySearch<SpotifySubtypes.Track>>> {
        try {
            const track = (await spotify(url)) as SpotifyTrack;
            const video = await this.handleTextSearch(Hopper.youtubeSearchEquivalent(track), track);

            if (video instanceof HopperError) {
                return { success: true, items: [], errors: [video], playlistMetadata: undefined };
            }

            const disc = this.handleYouTubeVideo(video);

            if (disc instanceof VideoHopperError) {
                // this should never happen, since the `handleTextSearch()` method
                // should always return a valid video
                this.logger?.log(`Impossible event: 2x VideoHopperErrors`, {
                    interaction: this.interaction,
                    disc,
                    video,
                    track,
                    url,
                    search: this.search,
                });
                return { success: true, items: [], errors: [disc], playlistMetadata: undefined };
            }

            return { success: true, items: [disc], errors: [], playlistMetadata: undefined };
        } catch (error) {
            return { success: false, error };
        }
    }

    private async handleSpotifyPlaylistURL(
        url: string,
    ): Promise<HopperResult<ValidSpotifySearch<SpotifySubtypes.Playlist>>> {
        try {
            const playlist = (await spotify(url)) as SpotifyPlaylist;
            const tracks = (await playlist.all_tracks()).slice(0, this.maxItems);

            const items: MusicDisc[] = [];
            const errors: (HopperError<SearchSources.Spotify> | VideoHopperError<BrokenReasons>)[] = [];

            await Promise.all(
                tracks.map(async (track) => {
                    const video = await this.handleTextSearch(Hopper.youtubeSearchEquivalent(track), track);
                    if (video instanceof HopperError) {
                        errors.push(video);
                    } else {
                        const disc = this.handleYouTubeVideo(video);
                        if (disc instanceof VideoHopperError) {
                            // this should never happen, since the `handleTextSearch()` method
                            // should always return a valid video
                            errors.push(disc);
                        } else {
                            items.push(disc);
                        }
                    }
                }),
            );

            return {
                success: true,
                items,
                errors,
                playlistMetadata: {
                    playlistName: playlist.name,
                    playlistImageURL: playlist.thumbnail.url,
                    playlistSize: playlist.tracksCount,
                    playlistURL: playlist.url,
                    createdBy: playlist.collaborative ? `${playlist.owner.name} + others` : playlist.owner.name,
                },
            };
        } catch (error) {
            return { success: false, error };
        }
    }

    private async handleSpotifyAlbumURL(url: string): Promise<HopperResult<ValidSpotifySearch<SpotifySubtypes.Album>>> {
        try {
            const album = (await spotify(url)) as SpotifyAlbum;
            const tracks = (await album.all_tracks()).slice(0, this.maxItems);

            const items: MusicDisc[] = [];
            const errors: (HopperError<SearchSources.Spotify> | VideoHopperError<BrokenReasons>)[] = [];

            await Promise.all(
                tracks.map(async (track) => {
                    const video = await this.handleTextSearch(Hopper.youtubeSearchEquivalent(track), track);
                    if (video instanceof HopperError) {
                        errors.push(video);
                    } else {
                        const disc = this.handleYouTubeVideo(video);
                        if (disc instanceof VideoHopperError) {
                            // this should never happen, since the `handleTextSearch()` method
                            // should always return a valid video
                            errors.push(disc);
                        } else {
                            items.push(disc);
                        }
                    }
                }),
            );

            return {
                success: true,
                items,
                errors,
                playlistMetadata: {
                    playlistName: album.name,
                    playlistImageURL: album.thumbnail.url,
                    playlistSize: album.tracksCount,
                    playlistURL: album.url,
                    createdBy: album.artists.map((e) => e.name).join(`, `),
                },
            };
        } catch (error) {
            return { success: false, error };
        }
    }

    /**
     * Attempts to get a YouTube video by searching with the given text query.
     *
     * @param {string} text The final search query to use.
     * @param {SpotifyTrack|null} [track=null] Whether the search text is derived from a Spotify track.
     * @param {number} [limit=3] The number of results to pick the 'best' out of, default 3.
     *
     */
    private async handleTextSearch(
        text: string,
        track: null,
        limit?: number,
    ): Promise<
        | YouTubeVideo
        | ConversionHopperError<SearchSources.Text>
        | NoResultsHopperError<SearchSources.Text>
        | VideoHopperError<BrokenReasons>
    >;

    private async handleTextSearch(
        text: string,
        track: SpotifyTrack,
        limit?: number,
    ): Promise<HandleTextSearchResponse<SearchSources.Spotify>>;

    private async handleTextSearch(
        text: string,
        track: SpotifyTrack | null,
        limit: number = 3,
    ): Promise<HandleTextSearchResponse> {
        console.log(`Searching for ${text}`);
        const results = await search(text, { source: { youtube: `video` }, fuzzy: true, limit });
        if (!results.length)
            if (track === null) {
                // non spotify version of no results error
                return new NoResultsHopperError<SearchSources.Text>(text, text);
            } else {
                // spotify version of no results error
                return new NoResultsHopperError<SearchSources.Spotify>(track, text);
            }

        const levenshteinData = results.map((e) => {
            if (e.title === undefined) return 0;
            return levenshteinDistance(e.title, text);
        });

        // console.log(
        //     `Searched for "${text}" and got 3 results:\n${results
        //         .map((e, i) => `${i + 1}. ${e.title ?? `Unknown Video`} [${levenshteinData[i]}]`)
        //         .join(`\n`)}`,
        // );

        const highestSimilarity = Math.max(...levenshteinData);
        const bestIndex = levenshteinData.indexOf(highestSimilarity);
        const bestResult = results[bestIndex];

        if (highestSimilarity < Config.levenshteinThreshold) {
            if (track === null) {
                // non spotify version of no results error
                return new ConversionHopperError<SearchSources.Text>(text, highestSimilarity, bestResult, text);
            } else {
                // spotify version of no results error
                return new ConversionHopperError<SearchSources.Spotify>(track, highestSimilarity, bestResult, text);
            }
        }

        return bestResult;
    }

    /**
     * Converts data from a track into a string to search Youtube with.
     *
     * Currently it just does "author names song name lyrics", e.g.
     * "Alan Walker Faded lyrics"
     */
    private static youtubeSearchEquivalent({ artists, name }: SpotifyTrack): string {
        return `${artists.map(({ name }) => name).join(` `)} ${name} lyrics`;
    }
}
