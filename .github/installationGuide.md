# Installation Guide

Make sure you have [Node.js](https://nodejs.org/en/) installed on your computer. It should be a version between 16.9 and 17.

To set up your own version of JukeBot, follow these steps

1. Make a Discord Application

    1. Head over to the [Discord Developer Portal](https://discord.com/developers/applications) and make a new application
    2. Go to the Bot section and add a bot
        - Copy the token that it generates, you'll need it later
    3. Go to the OAuth2 > URL Generator section and select
        - Scopes: `bot`, `applications.commands`
        - Bot Permissions: `Send Messages`, `Embed Links`, `Connect`, `Speak`
    4. Copy the generated URL and paste it into a new tab to invite your bot to a server

2. Clone this Repository

    1. Open a terminal (`` CTRL + ` `` in VSCode) and copy/paste (or type) the following:

        ```sh
        git clone https://github.com/NachoToast/Jukebot.git
        cd Jukebot
        cp auth.example.json auth.json
        ```

    2. Fill out the `token` field in [auth.json](../auth.json) with your Discord bot token from step 1(ii)

3. Set up Authorization

    2. For all remaining steps, [yarn](https://yarnpkg.com/) is recommended over `npm`, you can install it using the following command:

        ```sh
        npm i -g yarn
        ```

    3. Spotify Authorization

        - Jukebot uses Spotify to allow people to queue their playlists, albums, and other tracks

        - If you get stuck in the following steps, you can consult [these instructions](https://github.com/play-dl/play-dl/tree/5d4485a54e01665ef2126d043f30498d8596c27a/instructions#spotify)

        <br />

        1. Run the authorization script using `yarn auth` or `npm run auth`
        1. Type "Yes" when prompted to save to file
        1. Type "sp" for Spotify
        1. Make a Spotify application from [here](https://developer.spotify.com/dashboard/applications), be sure to make a redirect URI for it in the `overview > edit settings` menu (this can be any valid URL).
        1. Fill in your Spotify client ID, secret, and redirect URI when prompted
        1. Enter "NZ" or your preferred country code
        1. Follow the remaining instructions

    4. YouTube Authorization

        - Jukebot uses YouTube to allow the queueing of age-restricted videos. You don't need to do this step, but you might get a few errors occurring if people try to queue age-restricted content

        <br />

        1. Run the authorization script again
        2. Type "Yes" when prompted to save to file
        3. Type "yo" for YouTube
        4. Follow [these instructions](https://github.com/play-dl/play-dl/tree/5d4485a54e01665ef2126d043f30498d8596c27a/instructions#youtube-cookies) to get cookies

4. Install Dependencies

    - Open a terminal (`` CTRL + ` `` in VSCode) and install dependencies:

        ```sh
        # with yarn
        yarn

        # with npm
        npm install
        ```

    - If needed, you can instead install production-only dependencies using:

        ```sh
        # with yarn
        yarn install --production

        # with npm
        npm install --production
        ```

    - If you're getting errors during install, it might be [sodium](./sodium.md).

5. Start the Bot

    - In development

        ```sh
        # with yarn
        yarn dev

        # with npm
        npm run dev
        ```

    - In production

        - Build

            ```sh
            # with yarn
            yarn build

            # with npm
            npm run build
            ```

        - Start
            ```sh
            node .
            ```
