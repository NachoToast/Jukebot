import { YouTubeVideo, SpotifyTrack } from 'play-dl';
import { SearchSources } from '../../../types/SearchTypes';

/**
 * Relevant resource to give to error constructor for each search type.
 *
 * Basically just says that:
 * - YouTube search errors require a {@link YouTubeVideo YouTube video} as metadata.
 * - Spotify search errors require a {@link SpotifyTrack} as metadata.
 * - Text search errors require a string (the original text search) as metadata.
 */
export type RelevantResource<T extends SearchSources.YouTube | SearchSources.Spotify | SearchSources.Text> =
    T extends SearchSources.YouTube ? YouTubeVideo : T extends SearchSources.Spotify ? SpotifyTrack : string;
