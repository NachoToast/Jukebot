# JukeBot

A music streaming Discord bot by NachoToast.

<!-- To add Jukebot to your server, [click here](). -->

## Installation

See the [installation guide](./.github/installationGuide.md) for a more beginner-friendly walkthrough.

<details open>

<summary>Installing Jukebot</summary>
<br >

-   Node v16.13.0 or greater
-   If you're getting install errors, it might be [sodium](./.github/sodium.md).
-   Scopes
    -   bot
    -   applications.commands
-   Permissions
    -   Send Messages
    -   Connect
    -   Speak
-   Gateway Intents
    -   None
-   Put your bot token in [`auth.json`](./auth.json)
    -   See [auth.example.json](./auth.example.json) for syntax.
    -   `yarn dev` uses `devToken`, otherwise `token` is used.
-   Run `yarn auth` to set up Spotify and YouTube authorization.
    -   You will need to run it twice, once for YouTube and once for spotify (save to file both times).
    -   Spotify:
        -   Your redirect URL can be anything, as long as its listed in your Spotify application's `Redirect URIs`.
    -   YouTube:
        -   Use cookies from the request headers of any YouTube video (via chrome Network tab)
    -   For more information on what to fill out, see [the instructions](https://github.com/play-dl/play-dl/tree/5d4485a54e01665ef2126d043f30498d8596c27a/instructions).

```sh
# development
yarn install
yarn dev
```

```sh
# production
yarn install --prod=true
yarn build
node . # or 'yarn start'
```

</details>
