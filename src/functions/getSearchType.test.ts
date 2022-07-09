import { InvalidSearch, SearchSources, SpotifySubtypes, ValidSearch, YouTubeSubtypes } from '../types/SearchTypes';
import { getSearchType } from './getSearchType';

describe(`getSearchType`, () => {
    // lots of tests for this one :)

    it(`Validates YouTube video URLs`, () => {
        const valid: ValidSearch = {
            valid: true,
            source: SearchSources.YouTube,
            type: YouTubeSubtypes.Video,
        };

        const invalid: InvalidSearch = {
            valid: false,
            source: SearchSources.YouTube,
        };

        expect(getSearchType(`https://www.youtube.com/watch?v=uAy9iHsj0HU`)).toEqual(valid);
        expect(getSearchType(`https://youtu.be/60ItHLz5WEA`)).toEqual(valid); // shortened url (only on YouTube videos)
        expect(getSearchType(`https://youtube.com/watch?v=abcdefg`)).toEqual(valid); // no www
        expect(getSearchType(`https://www.youtube.com/watch`)).toEqual(invalid);
        expect(getSearchType(`https://www.youtube.com/`)).toEqual(invalid);
    });

    it(`Validates YouTube playlist URLs`, () => {
        const valid: ValidSearch = {
            valid: true,
            source: SearchSources.YouTube,
            type: YouTubeSubtypes.Playlist,
        };

        const invalid: InvalidSearch = {
            valid: false,
            source: SearchSources.YouTube,
        };

        expect(getSearchType(`https://www.youtube.com/playlist?list=PLA61KdzeZtK54MJ7V6XjPCUe6aCyKU3dp`)).toEqual(
            valid,
        );

        // videos from playlists count too
        expect(
            getSearchType(
                `https://www.youtube.com/watch?v=E5nsRs1e_q0&list=PLA61KdzeZtK54MJ7V6XjPCUe6aCyKU3dp&index=1`,
            ),
        ).toEqual(valid);

        expect(getSearchType(`https://youtube.com/playlist`)).toEqual(invalid);
    });

    it(`Validates Spotify track URLs`, () => {
        const valid: ValidSearch = {
            valid: true,
            source: SearchSources.Spotify,
            type: SpotifySubtypes.Track,
        };

        const invalid: InvalidSearch = {
            valid: false,
            source: SearchSources.Spotify,
        };

        expect(getSearchType(`https://open.spotify.com/track/20OjFkqDnJKYnZe2HTh4oK`)).toEqual(valid);
        expect(getSearchType(`https://open.spotify.com/track/2OfQvGrr83FGpdLA1nAR01?si=fake`)).toEqual(valid);
        expect(getSearchType(`https://open.spotify.com/`)).toEqual(invalid);
    });

    it(`Validates Spotify playlist URLs`, () => {
        const valid: ValidSearch = {
            valid: true,
            source: SearchSources.Spotify,
            type: SpotifySubtypes.Playlist,
        };

        const invalid: InvalidSearch = {
            valid: false,
            source: SearchSources.Spotify,
        };

        expect(getSearchType(`https://open.spotify.com/playlist/1BaaQnVeKIJfazUPsw4O70?si=abc123`)).toEqual(valid);
        expect(getSearchType(`https://open.spotify.com/playlist/1hTGymCQls1Dd5DL2fYPGP`)).toEqual(valid);
        expect(getSearchType(`https://open.spotify.com/play/`)).toEqual(invalid);
    });

    it(`Invalidates unknown URLs`, () => {
        const invalid: InvalidSearch = {
            valid: false,
            source: SearchSources.Unknown,
        };

        expect(getSearchType(`https://google.com/track/eieio`)).toEqual(invalid);
        expect(getSearchType(`https://youtubee.com/NachoToast`)).toEqual(invalid);
        expect(getSearchType(`https://spootify.com`)).toEqual(invalid);
        expect(getSearchType(`http://youtub.com`)).toEqual(invalid);
    });

    it(`Invalidates bad URLs`, () => {
        const invalid: InvalidSearch = {
            valid: false,
            source: SearchSources.Invalid,
        };

        expect(getSearchType(`nachotoast.com`)).toEqual(invalid);
    });

    it(`Validates text searches`, () => {
        const valid: ValidSearch = {
            valid: true,
            source: SearchSources.Text,
        };

        const invalid: InvalidSearch = {
            valid: false,
            source: SearchSources.Text,
        };

        expect(getSearchType(`alan walker - faded`)).toEqual(valid);
        expect(getSearchType(`spotify greatest hits`)).toEqual(valid);

        expect(getSearchType(``)).toEqual(invalid);
        expect(getSearchType(`abc`)).toEqual(invalid);
    });
});
