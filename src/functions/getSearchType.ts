import { AnySearch, SearchSources, SpotifySubtypes, YouTubeSubtypes } from '../types/SearchTypes';

/** Infers the search type of an input string, such as a Spotify track or a YouTube playlist. */
export function getSearchType(s: string): AnySearch {
    try {
        const url = new URL(s);

        if (url.host.match(/^(www\.)?youtube\.com$/g)) {
            if (url.searchParams.has(`list`)) {
                // youtube playlist
                return { valid: true, source: SearchSources.YouTube, type: YouTubeSubtypes.Playlist };
            }
            if (url.searchParams.has(`v`)) {
                // youtube video
                return { valid: true, source: SearchSources.YouTube, type: YouTubeSubtypes.Video };
            }
            return { valid: false, source: SearchSources.YouTube };
        }

        if (url.host === `youtu.be`) {
            // url shortened youtube video
            return { valid: true, source: SearchSources.YouTube, type: YouTubeSubtypes.Video };
        }

        if (url.host === `open.spotify.com`) {
            if (url.pathname.startsWith(`/track/`)) {
                return { valid: true, source: SearchSources.Spotify, type: SpotifySubtypes.Track };
            }
            if (url.pathname.startsWith(`/playlist/`)) {
                return { valid: true, source: SearchSources.Spotify, type: SpotifySubtypes.Playlist };
            }
            if (url.pathname.startsWith(`/album/`)) {
                return { valid: true, source: SearchSources.Spotify, type: SpotifySubtypes.Album };
            }
            return { valid: false, source: SearchSources.Spotify };
        }

        return { valid: false, source: SearchSources.Unknown };
    } catch (error) {
        // url creation error, so might not be a url

        if (s.startsWith(`http`) || s.endsWith(`.com`)) {
            // most likely a url, which means it must be invalid since we had an error earlier
            return { valid: false, source: SearchSources.Invalid };
        }

        if (s.length > 3) {
            return { valid: true, source: SearchSources.Text };
        }
        return { valid: false, source: SearchSources.Text };
    }
}
