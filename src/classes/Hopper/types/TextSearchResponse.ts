import { YouTubeVideo } from 'play-dl';
import { SearchSources } from '../../../types/SearchTypes';
import { ConversionHopperError, NoResultsHopperError, VideoHopperError } from '../Errors';
import { BrokenReasons } from './BrokenReasons';

/**
 * Relevant response from searching a Spotify track name or plaintext search, could be a:
 *
 * - {@link YouTubeVideo YouTube video} on success,
 * - {@link ConversionHopperError<T> Conversion error} if no good results found,
 * - {@link NoResultsHopperError<T> No results error} if no results are found at all, or a
 * - {@link VideoHopperError<BrokenReasons> Broken video error } if the video found isn't valid.
 */
export type HandleTextSearchResponse<
    T extends SearchSources.Text | SearchSources.Spotify = SearchSources.Text | SearchSources.Spotify,
> = YouTubeVideo | ConversionHopperError<T> | NoResultsHopperError<T> | VideoHopperError<BrokenReasons>;
