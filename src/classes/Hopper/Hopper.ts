import {
    is_expired,
    refreshToken,
    YouTubeVideo,
    video_basic_info,
    YouTubePlayList,
    playlist_info,
    spotify,
    SpotifyTrack,
    SpotifyAlbum,
    search,
} from 'play-dl';
import { promisify } from 'util';
import { chooseRandomDisc } from '../../functions/chooseRandomDisc';
import { levenshteinDistance } from '../../functions/levenshtein';
import { Config } from '../../global/Config';
import { Loggers } from '../../global/Loggers';
import { JukebotInteraction } from '../../types/JukebotInteraction';
import {
    MapSearchSourceToFinalTypes,
    MapSearchSourceToTypes,
    SpotifySearchReturnValue,
    SpotifySearchTypes,
    TextSearchTypes,
    ValidSearch,
    ValidSearchSources,
    YouTubeSearchTypes,
} from '../../types/Searches';
import { MusicDisc } from '../MusicDisc';
import {
    HopperAuthorizationError,
    HopperTimeoutError,
    HopperItemError,
    HopperItemVideoError,
    HopperUnknownError,
    HopperItemNoResultsError,
    HopperItemConversionError,
} from './Errors';
import { HopperProps, HopperResult, BrokenReasons, HopperSingleErrorResponse } from './types';

const wait = promisify(setTimeout);

/** Handles fetching of results from a query string. */
export class Hopper<T extends ValidSearchSources, K extends MapSearchSourceToTypes<T>> {
    /** Interaction to note as origin for any generated MusicDiscs. */
    public readonly interaction: JukebotInteraction;

    /**
     * Metadata about the search, such as its source (YouTube, Spotify, Text)
     * and subtype (Video, Track, Album, etc...).
     */
    public readonly search: ValidSearch<T, K>;

    /** The original search term. */
    public readonly searchTerm: string;

    /** Maximum number of items to return, `undefined` means no limit. */
    public readonly maxItems: number | undefined;

    public constructor(props: HopperProps<T, K>) {
        this.interaction = props.interaction;
        this.search = props.search;
        this.searchTerm = props.searchTerm;
        this.maxItems = props.maxItems;
    }

    /**
     * Fetches results from a valid search in the
     * {@link Config.timeoutThresholds.fetchResults configured time}.
     *
     * @throws Throws a `HopperError` if:
     * - Unable to fetch in time.
     * - Spotify authorization failed (for Spotify searches).
     * - Another unknown error occurs.
     */
    public async fetchResults(): Promise<HopperResult<T, K>> {
        try {
            if (is_expired()) {
                if (this.search.source === ValidSearchSources.Spotify) {
                    // we need to wait for a token refresh to use Spotify's API
                    if (!(await refreshToken())) {
                        throw new HopperAuthorizationError();
                    }
                } else {
                    // otherwise we can just do it in the background, asynchronously :)
                    refreshToken().catch((e) => Loggers.warn.log(`Spotify background authentication failed`, e));
                }
            }
        } catch (error) {
            if (error instanceof HopperAuthorizationError) throw error;
            else {
                Loggers.warn.log(`Spotify authentication failed`, error);
                throw new HopperAuthorizationError();
            }
        }

        const fetchRace: Promise<HopperResult<T, K> | void>[] = [this.internalFetch()];

        if (Config.timeoutThresholds.fetchResults) {
            fetchRace.push(wait(Config.timeoutThresholds.fetchResults * 1000));
        }

        const result = (await Promise.race(fetchRace)) ?? undefined;

        if (result === undefined) {
            throw new HopperTimeoutError(this.searchTerm);
        }

        return result;
    }

    private async internalFetch(): Promise<
        HopperResult<ValidSearchSources, TextSearchTypes | SpotifySearchTypes | YouTubeSearchTypes>
    > {
        switch (this.search.source) {
            case ValidSearchSources.YouTube:
                switch (this.search.type) {
                    case YouTubeSearchTypes.Playlist:
                        return await this.handleYouTubePlaylistURL(this.searchTerm);
                    case YouTubeSearchTypes.Video:
                        return await this.handleYouTubeVideoURL(this.searchTerm);
                    default:
                        throw new HopperUnknownError(this.searchTerm, `Unrecognized YouTube search type`);
                }
            case ValidSearchSources.Spotify:
                switch (this.search.type) {
                    case SpotifySearchTypes.Album:
                        return await this.handleSpotifyAlbumURL(this.searchTerm);

                    case SpotifySearchTypes.Playlist:
                        return await this.handleSpotifyPlaylistURL(this.searchTerm);

                    case SpotifySearchTypes.Track:
                        return await this.handleSpotifyTrackURL(this.searchTerm);
                    default:
                        throw new HopperUnknownError(this.searchTerm, `Unrecognized Spotify search type`);
                }
            case ValidSearchSources.Text: {
                switch (this.search.type) {
                    case TextSearchTypes.Text: {
                        const res = await this.handleTextSearch(this.searchTerm);
                        if (res instanceof YouTubeVideo) {
                            const disc = this.handleYouTubeVideo(res);
                            if (disc instanceof MusicDisc) {
                                return {
                                    items: [disc],
                                    errors: [],
                                    playlistMetadata: undefined,
                                };
                            } else {
                                return {
                                    items: [],
                                    errors: [disc],
                                    playlistMetadata: undefined,
                                };
                            }
                        } else {
                            return {
                                items: [],
                                errors: [res],
                                playlistMetadata: undefined,
                            };
                        }
                    }
                    default:
                        throw new HopperUnknownError(this.searchTerm, `Unrecognized text search type`);
                }
            }
            default:
                throw new HopperUnknownError(this.searchTerm, `Unrecognized search source`);
        }
    }

    /** Tries to convert a YouTube video to a MusicDisc. */
    private handleYouTubeVideo(video: YouTubeVideo): MusicDisc | HopperItemError<ValidSearchSources.YouTube> {
        if (video.private) return new HopperItemVideoError(video, BrokenReasons.Private, undefined);
        if (video.upcoming) return new HopperItemVideoError(video, BrokenReasons.Upcoming, undefined);
        if (video.type !== `video`) return new HopperItemVideoError(video, BrokenReasons.NotAVideo, undefined);
        return new MusicDisc(this.interaction, video);
    }

    /** Handles a YouTube video URL, throwing a {@link HopperUnknownError} if anything fails. */
    private async handleYouTubeVideoURL(
        url: string,
    ): Promise<HopperResult<ValidSearchSources.YouTube, YouTubeSearchTypes.Video>> {
        let video: YouTubeVideo;
        try {
            video = (await video_basic_info(url)).video_details;
        } catch (error) {
            throw new HopperUnknownError(this.searchTerm, { error, url });
        }

        const disc = this.handleYouTubeVideo(video);

        if (disc instanceof MusicDisc) {
            return {
                items: [disc],
                errors: [],
                playlistMetadata: undefined,
            };
        } else {
            return {
                items: [],
                errors: [disc],
                playlistMetadata: undefined,
            };
        }
    }

    /** Handles a YouTube playlist URL, throwing a {@link HopperUnknownError} if anything fails. */
    private async handleYouTubePlaylistURL(
        url: string,
    ): Promise<HopperResult<ValidSearchSources.YouTube, YouTubeSearchTypes.Playlist>> {
        let playlist: YouTubePlayList;
        let videos: YouTubeVideo[];

        try {
            playlist = await playlist_info(url, { incomplete: true });
            videos = await playlist.next(this.maxItems);
        } catch (error) {
            throw new HopperUnknownError(this.searchTerm, { error, url });
        }

        const items: MusicDisc[] = [];
        const errors: HopperItemError<ValidSearchSources.YouTube>[] = [];

        videos.forEach((video) => {
            const disc = this.handleYouTubeVideo(video);
            if (disc instanceof MusicDisc) items.push(disc);
            else errors.push(disc);
        });

        return {
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
    }

    /** Handles a Spotify track URL, throwing a {@link HopperUnknownError} if anything fails. */
    private async handleSpotifyTrackURL(
        url: string,
    ): Promise<HopperResult<ValidSearchSources.Spotify, SpotifySearchTypes.Track>> {
        let track: SpotifyTrack;

        try {
            track = (await spotify(url)) as SpotifyTrack;
        } catch (error) {
            throw new HopperUnknownError(this.searchTerm, { error, url });
        }

        const { items, errors } = await this.processTracks([track]);

        return {
            items,
            errors,
            playlistMetadata: undefined,
        };
    }

    /** Handles YouTube searching Spotify tracks, categorising (but not throwing) any errors which occur. */
    private async processTracks(tracks: SpotifyTrack[]): Promise<{
        items: MusicDisc[];
        errors: HopperSingleErrorResponse<ValidSearchSources.Spotify>[];
    }> {
        const rawItems: (MusicDisc | null)[] = new Array(tracks.length).fill(null);
        const errors: HopperSingleErrorResponse<ValidSearchSources.Spotify>[] = [];

        await Promise.all(
            tracks.map(async (track, index) => {
                const video = await this.handleTextSearch(track);
                if (video instanceof HopperItemError || video instanceof HopperUnknownError) {
                    errors.push(video);
                } else {
                    const disc = this.handleYouTubeVideo(video);
                    if (disc instanceof HopperItemError) {
                        // this should never happen, since the `handleTextSearch()` method
                        // does the same checks as `handleYouTubeVideo`, so it should be
                        // impossible for `video` to be valid while `disc` isn't.
                        errors.push(new HopperUnknownError(track.name, disc.toString()));
                        Loggers.warn.log(
                            `Impossibility: VideoHopperError after "handleYouTubeVideo" but not after "handleTextSearch"`,
                            { disc: disc.toString(), video: video.toJSON() },
                        );
                    } else {
                        rawItems[index] = disc;
                    }
                }
            }),
        );

        return { items: rawItems.filter((e) => e !== null) as MusicDisc[], errors };
    }

    /**
     * Handles and processes results from a Spotify album or track URL.
     *
     * @throws Throws a {@link HopperUnknownError} if getting tracks fails.
     */
    private async internalSpotifyHandler<T extends SpotifySearchTypes.Playlist | SpotifySearchTypes.Album>(
        url: string,
    ): Promise<
        HopperResult<
            ValidSearchSources.Spotify,
            T extends SpotifySearchTypes.Playlist ? SpotifySearchTypes.Playlist : SpotifySearchTypes.Album
        >
    > {
        type Container = SpotifySearchReturnValue<T>;

        let container: Container | undefined = undefined;
        let tracks: SpotifyTrack[];

        try {
            container = (await spotify(url)) as Container;
        } catch (error) {
            throw new HopperUnknownError(container?.name || url, {
                error,
                url,
                receivedType: container?.type,
                step: `FetchContainer`,
            });
        }

        try {
            tracks = (await container.all_tracks()).slice(0, this.maxItems);
        } catch (error) {
            throw new HopperUnknownError(container.name, {
                error,
                url,
                container: container.toJSON(),
                step: `FetchTracks`,
            });
        }

        const { items, errors } = await this.processTracks(tracks);

        return {
            items,
            errors,
            playlistMetadata: {
                playlistName: container.name,
                playlistImageURL: container.thumbnail.url,
                playlistSize: container.tracksCount,
                playlistURL: container.url,
                createdBy:
                    container instanceof SpotifyAlbum
                        ? container.artists.map((e) => e.name).join(`, `)
                        : container.collaborative
                        ? `${container.owner.name} + others`
                        : container.owner.name,
            },
        };
    }

    /** Handles a Spotify playlist URL, throwing a {@link HopperUnknownError} if anything fails. */
    private async handleSpotifyPlaylistURL(
        url: string,
    ): Promise<HopperResult<ValidSearchSources.Spotify, SpotifySearchTypes.Playlist>> {
        return await this.internalSpotifyHandler<SpotifySearchTypes.Playlist>(url);
    }

    /** Handles a Spotify album URL, throwing a {@link HopperUnknownError} if anything fails. */
    private async handleSpotifyAlbumURL(
        url: string,
    ): Promise<HopperResult<ValidSearchSources.Spotify, SpotifySearchTypes.Album>> {
        return await this.internalSpotifyHandler<SpotifySearchTypes.Album>(url);
    }

    /**
     * Attempts to get a YouTube video by searching with the given text or Spotify track query.
     *
     * Will convert Spotify track names to their more searchable equivalents using
     * the {@link Hopper.youtubeSearchEquivalent} method.
     *
     * @param {SpotifyTrack|string} searchItem The item to search for on YouTube.
     * @param {number} [limit=3] The number of results to pick the 'best' out of, default 3.
     */
    private async handleTextSearch<T extends ValidSearchSources.Spotify | ValidSearchSources.Text>(
        searchItem: MapSearchSourceToFinalTypes<T>,
        limit: number = 3,
    ): Promise<YouTubeVideo | HopperSingleErrorResponse<T>> {
        const searchTerm = typeof searchItem === `string` ? searchItem : Hopper.youtubeSearchEquivalent(searchItem);
        let results: YouTubeVideo[];

        try {
            results = await search(searchTerm, { source: { youtube: `video` }, limit });

            // filter out results like [1 HOUR] for spotify tracks
            if (typeof searchItem !== `string`) {
                results = results.filter((e) => !e.title?.toLowerCase().includes(`hour`));
            }
        } catch (error) {
            return new HopperUnknownError(searchTerm, error);
        }

        if (!results.length) {
            return new HopperItemNoResultsError<T>(searchItem);
        }

        const levenshteinData = results.map((e) => {
            if (e.title === undefined) return 0;

            // some videos are formatted `authorName - songName` and some are `songName - authorName`,
            // this attempts to account for these differences by getting the greatest levenshtein
            // distance out of both the reversed and non-reversed title
            const reversedTitle = e.title.split(` `).reverse().join(` `);
            return Math.max(levenshteinDistance(e.title, searchTerm), levenshteinDistance(reversedTitle, searchTerm));
        });

        const highestSimilarity = Math.max(...levenshteinData);
        const bestIndex = levenshteinData.indexOf(highestSimilarity);
        const bestResult = results[bestIndex];

        if (highestSimilarity < Config.levenshteinThreshold) {
            return new HopperItemConversionError<T>(searchItem, highestSimilarity, bestResult);
        }

        return bestResult;
    }

    /**
     * Converts data from a track into a string to search Youtube with.
     *
     * Currently it just does "author names song name ", e.g.
     * "Alan Walker Faded"
     */
    private static youtubeSearchEquivalent({ artists, name }: SpotifyTrack): string {
        return `${artists.map(({ name }) => name).join(` `)} ${name}`;
    }
}
