export enum YouTubeURLTypes {
    Video = 'youtubeVideo',
    Playlist = 'youtubePlaylist',
    Invalid = 'youtubeInvalid',
}

export enum SpotifyURLTypes {
    Track = 'spotifyTrack',
    Playlist = 'spotifyPlaylist',
    Album = 'spotifyAlbum',
    Invalid = 'spotifyInvalid',
}

export enum OtherTypes {
    ValidTextSearch = 'otherValidTextSearch',
    InvalidTextSearch = 'invalidTextSearch',
    InvalidURL = 'otherInvalidURL',
}

interface ValidSearchType {
    type:
        | YouTubeURLTypes.Video
        | YouTubeURLTypes.Playlist
        | SpotifyURLTypes.Track
        | SpotifyURLTypes.Playlist
        | SpotifyURLTypes.Album
        | OtherTypes.ValidTextSearch;
    valid: true;
}

interface InvalidSearchType {
    type: YouTubeURLTypes.Invalid | SpotifyURLTypes.Invalid | OtherTypes.InvalidURL | OtherTypes.InvalidTextSearch;
    valid: false;
}

export type SearchType = ValidSearchType | InvalidSearchType;

/** Infers the search type of an input string, useful for distinguishing URLs.
 * @param {string} s The string to check.
 * @returns {SearchTypes} What type of search the string should invoke (if valid).
 */
export function getSearchType(s: string): SearchType {
    try {
        const url = new URL(s);

        if (url.host.match(/^(www.)?youtube\.com$/g)) {
            if (url.searchParams.has('list')) {
                return { valid: true, type: YouTubeURLTypes.Playlist };
            }
            if (url.searchParams.has('v')) {
                return { valid: true, type: YouTubeURLTypes.Video };
            }
            return { valid: false, type: YouTubeURLTypes.Invalid };
        }
        if (url.host === 'youtu.be') {
            return { valid: true, type: YouTubeURLTypes.Video };
        }
        if (url.host === 'open.spotify.com') {
            if (url.pathname.startsWith('/track/')) {
                return { valid: true, type: SpotifyURLTypes.Track };
            }
            if (url.pathname.startsWith('/playlist/')) {
                return { valid: true, type: SpotifyURLTypes.Playlist };
            }
            if (url.pathname.startsWith('/album/')) {
                return { valid: true, type: SpotifyURLTypes.Album };
            }
            return { valid: false, type: SpotifyURLTypes.Invalid };
        }

        return { valid: false, type: OtherTypes.InvalidURL };
    } catch (error) {
        if (s.startsWith('http') || s.endsWith('.com')) {
            return { valid: false, type: OtherTypes.InvalidURL };
        }

        if (s.length > 3) {
            return { valid: true, type: OtherTypes.ValidTextSearch };
        }
        return { valid: false, type: OtherTypes.InvalidTextSearch };
    }
}
