export interface YouTubeSearch {
    source: 'youtube';
    type: 'video' | 'playlist';
}

export interface SpotifySearch {
    source: 'spotify';
    type: 'track' | 'album' | 'playlist';
}

export interface TextSearch {
    source: 'text';
    type: null;
}

export type Search = YouTubeSearch | SpotifySearch | TextSearch;
