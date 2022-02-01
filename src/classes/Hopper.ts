import { GuildedInteraction } from '../types/Interactions';
import { MusicDisc } from './MusicDisc';
import { getSearchType, OtherTypes, SearchType, SpotifyURLTypes, YouTubeURLTypes } from '../helpers/searchType';
import {
    playlist_info,
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

export interface OperationMeta {
    /** The number of items successfully converted to MusicDiscs. */
    songsAdded: number;

    /** The total number of items found. */
    songsFound: number;

    /** Total duration of all added items, in seconds. */
    totalDuration: number;
    sources: {
        spotify: number;
        youtube: number;
    };

    /** Levenshtein results of all items queried.
     *
     */
    levenshteinNumbers: {
        /** Input search term, either the title of a spotify track or the user's direct input. */
        searchTerm: string;
        /** The title of the YouTube video the `searchTerm` gave.
         *
         * In the event nothing was found in the search, this will be undefined.
         */
        foundTerm: string | undefined;

        /** Similarity between `searchTerm` and `foundTerm`, using Levenshtein distance.
         *
         * If `foundTerm` is undefined, this will be undefined too.
         */
        similarity: number | undefined;
    }[];

    /** The type of search that was inferred. */
    searchType: SearchType;
}

interface PlaylistReturn {
    discs: MusicDisc[];
    levenshteinNumbers: OperationMeta['levenshteinNumbers'];
    itemsFound: number;
}

/** Hopper instances handle the storing and serving of `MusicDiscs` to a `Jukeblock`. */
export abstract class Hopper {
    /** Attempts to find the relevant media from a search term.
     *
     * @param {GuildedInteraction} interaction - The interaction,
     * must have a `song` option specified
     * @returns {Promise<AddResponse>} Information about the operation.
     *
     * @throws Will throw an error if the interactions `song` option is not specified,
     * too short (<3 characters long), or not a string.
     */
    public static async add(interaction: GuildedInteraction): Promise<{ items: MusicDisc[]; meta: OperationMeta }> {
        const queryString = interaction.options.get('song', true).value;
        if (!queryString || typeof queryString !== 'string' || queryString.length < 3) {
            throw new TypeError("invalid 'song' option");
        }

        const searchType = getSearchType(queryString);
        const meta: OperationMeta = {
            songsAdded: 0,
            songsFound: 0,
            totalDuration: 0,
            sources: {
                spotify: 0,
                youtube: 0,
            },
            levenshteinNumbers: [],
            searchType,
        };
        const items: MusicDisc[] = [];
        if (!searchType.valid) return { items, meta };

        switch (searchType.type) {
            case YouTubeURLTypes.Video: {
                const discs = await Hopper.handleYouTubeVideoURL(interaction, queryString);
                items.push(...discs);
                meta.songsAdded += discs.length;
                meta.songsFound += discs.length;
                meta.sources.youtube += discs.length;
                break;
            }
            case YouTubeURLTypes.Playlist: {
                const discs = await Hopper.handleYouTubePlaylistURL(interaction, queryString);
                items.push(...discs);
                meta.songsAdded += discs.length;
                meta.songsFound += discs.length;
                meta.sources.youtube += discs.length;
                break;
            }
            case OtherTypes.ValidTextSearch: {
                const { discs, levenshteinNumbers } = await Hopper.handleTextSearch(interaction, [queryString]);
                items.push(...discs);
                meta.songsAdded += discs.length;
                meta.songsFound += discs.length;
                meta.sources.youtube += discs.length;
                meta.levenshteinNumbers.push(...levenshteinNumbers);
                break;
            }
            case SpotifyURLTypes.Album:
            case SpotifyURLTypes.Playlist:
            case SpotifyURLTypes.Track: {
                const { discs, levenshteinNumbers, itemsFound } = await Hopper.handleSpotifyURL(
                    interaction,
                    queryString,
                );
                items.push(...discs);
                meta.songsAdded += discs.length;
                meta.sources.spotify += discs.length;
                meta.levenshteinNumbers.push(...levenshteinNumbers);
                meta.songsFound += itemsFound;
                break;
            }
        }

        meta.totalDuration = Hopper.getTotalLength(items);

        return { items, meta };
    }

    /** Converts an array of
     * {@link YouTubeVideo youtube videos}
     * into a set of {@link MusicDisc music discs}.
     *
     * Notably will filter out "invalid" videos, such as videos that are:
     * - Private
     * - Upcoming (Premieres)
     * - Live
     */
    private static handleYouTubeVideo(interaction: GuildedInteraction, videos: YouTubeVideo[]): MusicDisc[] {
        const output: MusicDisc[] = [];

        videos.forEach((video) => {
            if (video.private || video.upcoming || video.live || video.type !== 'video') return;

            output.push(new MusicDisc(interaction, video));
        });

        return output;
    }

    private static async handleYouTubeVideoURL(interaction: GuildedInteraction, url: string): Promise<MusicDisc[]> {
        const video = (await video_basic_info(url)).video_details;
        return Hopper.handleYouTubeVideo(interaction, [video]);
    }

    private static async handleYouTubePlaylistURL(interaction: GuildedInteraction, url: string): Promise<MusicDisc[]> {
        const playlist = await playlist_info(url, { incomplete: true });
        const videos = (await playlist.all_videos()).slice(0, Jukebot.config.maxQueueSize);
        return Hopper.handleYouTubeVideo(interaction, videos);
    }

    private static async handleTextSearch(
        interaction: GuildedInteraction,
        searchStrings: string[],
    ): Promise<PlaylistReturn> {
        const searchResults = (
            await Promise.all(
                searchStrings.map((searchString) =>
                    search(searchString, { source: { youtube: 'video' }, fuzzy: true, limit: 1 }),
                ),
            )
        )
            // each search returns an array of videos, but we only want the first result
            // `limit: 1` means we should at max have 1 result per search string anyway
            .map((results) => results.at(0));

        const levenshteinNumbers: OperationMeta['levenshteinNumbers'] = new Array(searchResults.length);

        let itemsFound = 0;

        /** Videos that have passed the following Levenshtein checks. */
        const validVideos: YouTubeVideo[] = [];

        searchResults.forEach((video, index) => {
            const searchTerm = searchStrings[index];
            const foundTerm = video?.title;
            const similarity = foundTerm ? levenshteinDistance(foundTerm, searchTerm) : undefined;
            levenshteinNumbers.push({
                searchTerm,
                foundTerm,
                similarity,
            });

            if (video && similarity !== undefined && similarity >= Jukebot.config.levenshteinThreshold) {
                validVideos.push(video);
                itemsFound++;
            } else if (video) itemsFound++;
        });

        const discs = Hopper.handleYouTubeVideo(interaction, validVideos);

        return { discs, levenshteinNumbers, itemsFound };
    }

    private static async handleSpotifyURL(interaction: GuildedInteraction, url: string): Promise<PlaylistReturn> {
        const res = await spotify(url);
        switch (res.type) {
            case 'album':
                return await Hopper.handleSpotifyAlbum(interaction, res as SpotifyAlbum);
            case 'playlist':
                return await Hopper.handleSpotifyPlaylist(interaction, res as SpotifyPlaylist);
            case 'track':
                return await Hopper.handleSpotifyTrack(interaction, res as SpotifyTrack);
        }
    }

    private static async handleSpotifyAlbum(
        interaction: GuildedInteraction,
        album: SpotifyAlbum,
    ): Promise<PlaylistReturn> {
        const songNames = (await album.all_tracks()).slice(0, Jukebot.config.maxQueueSize).map(({ name }) => name);
        return await Hopper.handleTextSearch(interaction, songNames);
    }

    private static async handleSpotifyPlaylist(
        interaction: GuildedInteraction,
        playlist: SpotifyPlaylist,
    ): Promise<PlaylistReturn> {
        const songNames = (await playlist.all_tracks()).slice(0, Jukebot.config.maxQueueSize).map(({ name }) => name);
        return await Hopper.handleTextSearch(interaction, songNames);
    }

    private static async handleSpotifyTrack(
        interaction: GuildedInteraction,
        track: SpotifyTrack,
    ): Promise<PlaylistReturn> {
        return await Hopper.handleTextSearch(interaction, [track.name]);
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
