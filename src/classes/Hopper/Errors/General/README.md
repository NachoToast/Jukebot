# General Hopper Errors

These errors are **thrown** by the Hopper when the entirety of the result collecting process errors.

This can be due to a number of reasons:

-   [Spotify authorization](./AuthorizationError.ts) - (for Spotify searches only) Failed to (re)authorize with Spotify API.
-   [Timeout](./TimeoutError.ts) - Results could not be fetched within the [configured](../../../../global/Config.ts) time.

-   [Unknown](./UnknownError.ts) - Another error occurred that wasn't listed here, normally this is an error in the `play-dl` library.
