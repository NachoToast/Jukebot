import { getSearchType, OtherTypes, SearchType, SpotifyURLTypes, YouTubeURLTypes } from './searchType';

describe('searchType', () => {
    // lots of tests for this one :)

    it('validates YouTube video URLs', () => {
        const valid: SearchType = {
            valid: true,
            type: YouTubeURLTypes.Video,
        };
        const invalid: SearchType = {
            valid: false,
            type: YouTubeURLTypes.Invalid,
        };

        expect(getSearchType('https://www.youtube.com/watch?v=uAy9iHsj0HU')).toEqual(valid);
        expect(getSearchType('https://youtu.be/60ItHLz5WEA')).toEqual(valid); // shortened url (only on YouTube videos)
        expect(getSearchType('https://youtube.com/watch?v=abcdefg')).toEqual(valid); // no www
        expect(getSearchType('https://www.youtube.com/watch')).toEqual(invalid);
        expect(getSearchType('https://www.youtube.com/')).toEqual(invalid);
    });

    it('validates YouTube playlist URLs', () => {
        const valid: SearchType = {
            valid: true,
            type: YouTubeURLTypes.Playlist,
        };
        const invalid: SearchType = {
            valid: false,
            type: YouTubeURLTypes.Invalid,
        };

        expect(getSearchType('https://www.youtube.com/playlist?list=PLA61KdzeZtK54MJ7V6XjPCUe6aCyKU3dp')).toEqual(
            valid,
        );

        // videos from playlists count too
        expect(
            getSearchType(
                'https://www.youtube.com/watch?v=E5nsRs1e_q0&list=PLA61KdzeZtK54MJ7V6XjPCUe6aCyKU3dp&index=1',
            ),
        ).toEqual(valid);

        expect(getSearchType('https://youtube.com/playlist')).toEqual(invalid);
    });

    it('validates Spotify track URLs', () => {
        const valid: SearchType = {
            valid: true,
            type: SpotifyURLTypes.Track,
        };
        const invalid: SearchType = {
            valid: false,
            type: SpotifyURLTypes.Invalid,
        };

        expect(getSearchType('https://open.spotify.com/track/20OjFkqDnJKYnZe2HTh4oK?si=049354e561f74833')).toEqual(
            valid,
        );
        expect(getSearchType('https://open.spotify.com/track/2OfQvGrr83FGpdLA1nAR01?si=f01271d95063462d')).toEqual(
            valid,
        );
        expect(getSearchType('https://open.spotify.com/')).toEqual(invalid);
    });

    it('validates Spotify playlist URLs', () => {
        const valid: SearchType = {
            valid: true,
            type: SpotifyURLTypes.Playlist,
        };
        const invalid: SearchType = {
            valid: false,
            type: SpotifyURLTypes.Invalid,
        };

        expect(getSearchType('https://open.spotify.com/playlist/1BaaQnVeKIJfazUPsw4O70?si=780cbe3821cb4a27')).toEqual(
            valid,
        );
        expect(getSearchType('https://open.spotify.com/playlist/1hTGymCQls1Dd5DL2fYPGP')).toEqual(valid);
        expect(getSearchType('https://open.spotify.com/play/')).toEqual(invalid);
    });

    it('invalidates other URLs', () => {
        const invalid: SearchType = {
            valid: false,
            type: OtherTypes.InvalidURL,
        };

        expect(getSearchType('https://google.com/track/eieio')).toEqual(invalid);
        expect(getSearchType('https://youtubee.com/NachoToast')).toEqual(invalid);
        expect(getSearchType('https://spootify.com')).toEqual(invalid);
        expect(getSearchType('nachotoast.com')).toEqual(invalid);
        expect(getSearchType('http://youtub.com')).toEqual(invalid);
    });

    it('identifies a valid text search', () => {
        const valid: SearchType = {
            valid: true,
            type: OtherTypes.ValidTextSearch,
        };
        const invalid: SearchType = {
            valid: false,
            type: OtherTypes.InvalidTextSearch,
        };

        expect(getSearchType('alan walker - faded')).toEqual(valid);
        expect(getSearchType('spotify greatest hits')).toEqual(valid);

        expect(getSearchType('')).toEqual(invalid);
        expect(getSearchType('abc')).toEqual(invalid);
    });
});
