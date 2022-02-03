export enum SpotifyURLSubtypes {
    Track = 'track',
    Playlist = 'playlist',
    Album = 'album',
}

export enum YouTubeURLSubtypes {
    Video = 'video',
    Playlist = 'playlist',
}

interface BaseYouTubeURL {
    type: 'youtube';
}

export interface YouTubeVideoURL extends BaseYouTubeURL {
    subtype: YouTubeURLSubtypes.Video;
    valid: true;
}

export interface YouTubePlaylistURL extends BaseYouTubeURL {
    subtype: YouTubeURLSubtypes.Playlist;
    valid: true;
}

export interface YouTubeInvalidURL extends BaseYouTubeURL {
    valid: false;
}

interface BaseSpotifyURL {
    type: 'spotify';
}

export interface SpotifyTrackURL extends BaseSpotifyURL {
    subtype: SpotifyURLSubtypes.Track;
    valid: true;
}

export interface SpotifyPlaylistURL extends BaseSpotifyURL {
    subtype: SpotifyURLSubtypes.Playlist;
    valid: true;
}

export interface SpotifyAlbumURL extends BaseSpotifyURL {
    subtype: SpotifyURLSubtypes.Album;
    valid: true;
}
export interface SpotifyInvalidURL extends BaseSpotifyURL {
    valid: false;
}

interface BaseTextSearch {
    type: 'textSearch';
}

export interface ValidTextSearch extends BaseTextSearch {
    valid: true;
}

export interface InvalidTextSearch extends BaseTextSearch {
    valid: false;
}

export interface InvalidURL {
    type: 'otherURL';
    valid: false;
}

type YouTubeURL = YouTubeVideoURL | YouTubePlaylistURL | YouTubeInvalidURL;
type SpotifyURL = SpotifyTrackURL | SpotifyPlaylistURL | SpotifyAlbumURL | SpotifyInvalidURL;
type TextSearch = ValidTextSearch | InvalidTextSearch;

export type SearchType = YouTubeURL | SpotifyURL | TextSearch | InvalidURL;

/** Infers the search type of an input string, useful for distinguishing URLs.
 * @param {string} s The string to check.
 * @returns {SearchTypes} What type of search the string should invoke (if valid).
 */
export function getSearchType(s: string): SearchType {
    try {
        const url = new URL(s);

        if (url.host.match(/^(www\.)?youtube\.com$/g)) {
            if (url.searchParams.has('list')) {
                return { valid: true, type: 'youtube', subtype: YouTubeURLSubtypes.Playlist };
            }
            if (url.searchParams.has('v')) {
                return { valid: true, type: 'youtube', subtype: YouTubeURLSubtypes.Video };
            }
            return { valid: false, type: 'youtube' };
        }
        if (url.host === 'youtu.be') {
            return { valid: true, type: 'youtube', subtype: YouTubeURLSubtypes.Video };
        }
        if (url.host === 'open.spotify.com') {
            if (url.pathname.startsWith('/track/')) {
                return { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Track };
            }
            if (url.pathname.startsWith('/playlist/')) {
                return { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Playlist };
            }
            if (url.pathname.startsWith('/album/')) {
                return { valid: true, type: 'spotify', subtype: SpotifyURLSubtypes.Album };
            }
            return { valid: false, type: 'spotify' };
        }

        return { valid: false, type: 'otherURL' };
    } catch (error) {
        if (s.startsWith('http') || s.endsWith('.com')) {
            return { valid: false, type: 'otherURL' };
        }

        if (s.length > 3) {
            return { valid: true, type: 'textSearch' };
        }
        return { valid: false, type: 'textSearch' };
    }
}
