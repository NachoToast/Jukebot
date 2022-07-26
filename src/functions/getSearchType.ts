import {
    InvalidSearch,
    InvalidSearchSources,
    SearchObject,
    SpotifySearchTypes,
    TextSearchTypes,
    ValidSearch,
    ValidSearchSources,
    YouTubeSearchTypes,
} from '../types/Searches';

/** Infers the search type of an input string, such as a Spotify track or a YouTube playlist. */
export function getSearchType(s: string): SearchObject {
    try {
        const url = new URL(s);

        if (url.host.match(/^(www\.)?youtube\.com$/g)) {
            if (url.searchParams.has(`list`)) {
                // youtube playlist
                const output: ValidSearch<ValidSearchSources.YouTube, YouTubeSearchTypes.Playlist> = {
                    valid: true,
                    source: ValidSearchSources.YouTube,
                    type: YouTubeSearchTypes.Playlist,
                    needsPlaylistMetadata: true,
                };
                return output;
            }
            if (url.searchParams.has(`v`)) {
                // youtube video
                const output: ValidSearch<ValidSearchSources.YouTube, YouTubeSearchTypes.Video> = {
                    valid: true,
                    source: ValidSearchSources.YouTube,
                    type: YouTubeSearchTypes.Video,
                    needsPlaylistMetadata: false,
                };
                return output;
            }

            const output: InvalidSearch<ValidSearchSources.YouTube> = {
                valid: false,
                source: ValidSearchSources.YouTube,
            };
            return output;
        }

        if (url.host === `youtu.be`) {
            // url shortened youtube video
            const output: ValidSearch<ValidSearchSources.YouTube, YouTubeSearchTypes.Video> = {
                valid: true,
                source: ValidSearchSources.YouTube,
                type: YouTubeSearchTypes.Video,
                needsPlaylistMetadata: false,
            };
            return output;
        }

        if (url.host === `open.spotify.com`) {
            if (url.pathname.startsWith(`/track/`)) {
                const output: ValidSearch<ValidSearchSources.Spotify, SpotifySearchTypes.Track> = {
                    valid: true,
                    source: ValidSearchSources.Spotify,
                    type: SpotifySearchTypes.Track,
                    needsPlaylistMetadata: false,
                };
                return output;
            }
            if (url.pathname.startsWith(`/playlist/`)) {
                const output: ValidSearch<ValidSearchSources.Spotify, SpotifySearchTypes.Playlist> = {
                    valid: true,
                    source: ValidSearchSources.Spotify,
                    type: SpotifySearchTypes.Playlist,
                    needsPlaylistMetadata: true,
                };
                return output;
            }
            if (url.pathname.startsWith(`/album/`)) {
                const output: ValidSearch<ValidSearchSources.Spotify, SpotifySearchTypes.Album> = {
                    valid: true,
                    source: ValidSearchSources.Spotify,
                    type: SpotifySearchTypes.Album,
                    needsPlaylistMetadata: true,
                };
                return output;
            }

            const output: InvalidSearch<ValidSearchSources.Spotify> = {
                valid: false,
                source: ValidSearchSources.Spotify,
            };
            return output;
        }

        const output: InvalidSearch<InvalidSearchSources.Unknown> = {
            valid: false,
            source: InvalidSearchSources.Unknown,
        };
        return output;
    } catch (error) {
        // url creation error, so might not be a url

        if (s.startsWith(`http`) || s.endsWith(`.com`)) {
            // most likely a url, which means it must be invalid since we had an error earlier
            const output: InvalidSearch<InvalidSearchSources.Invalid> = {
                valid: false,
                source: InvalidSearchSources.Invalid,
            };
            return output;
        }

        if (s.length > 3) {
            const output: ValidSearch<ValidSearchSources.Text, TextSearchTypes.Text> = {
                valid: true,
                source: ValidSearchSources.Text,
                type: TextSearchTypes.Text,
                needsPlaylistMetadata: false,
            };
            return output;
        }
        const output: InvalidSearch<ValidSearchSources.Text> = {
            valid: false,
            source: ValidSearchSources.Text,
            type: TextSearchTypes.Text,
        };
        return output;
    }
}
