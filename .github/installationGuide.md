To set up your own version of JukeBot, follow these steps

1. Make a Discord Application

    1. Head over to the [Discord Developer Portal](https://discord.com/developers/applications) and make a new application
    2. Go to the Bot section and add a bot
        - Copy the token that it generates, you'll need it later
    3. Go to the OAuth2 > URL Generator section and select
        - Scopes: `bot`, `applications.commands`
        - Bot Permissions: `Send Messages`, `Connect`, `Speak`
    4. Copy the generated URL and paste it into a new tab to invite your bot to a server

2. Clone this Repository

    1. In VSCode, open the command palette (`CTRL + SHIFT + P`)
    2. Type `git clone` and press enter
    3. Paste the [link](https://github.com/NachoToast/Jukebot) to this repository and press enter again
    4. Select where to put the repository, then open it

3. Set up Authorization

    1. Copy the [`auth.example.json`](../auth.example.json) file

        1. Rename the copy to [`auth.json`](../auth.json)
        2. Fill out the `devToken` field with the token from step 1

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
        1. Make a Spotify application from [here](https://developer.spotify.com/dashboard/applications), be sure to make a redirect URI for it in the `overview > edit settings` menu
        1. Fill in your Spotify client ID and secret, the redirect URL doesn't matter so just make it any valid URL (you'll need to specify a valid URL from Spotify's side as well, )
        1. Enter "NZ" or your preferred country code
        1. Follow the remaining instructions.

    4. YouTube Authorization

        - Jukebot uses YouTube to the queueing of age-restricted videos. You don't need to do this step, but you might get a few errors occurring if people try to queue age-restricted content

        <br />

        1. Run the authorization script again
        2. Type "Yes" when prompted to save to file
        3. Type "yo" for YouTube
        4. Follow [these instructions](https://github.com/play-dl/play-dl/tree/5d4485a54e01665ef2126d043f30498d8596c27a/instructions#youtube-cookies) to get cookies

4. Install Dependencies

    - Open a terminal (`` CTRL + ` `` in VSCode) and install dependencies

        ```sh
        # with yarn
        yarn

        # with npm
        npm install
        ```

    - You can install yarn using:

        ```sh
        npm i -g yarn
        ```

    - You can install production-only dependencies using:

        ```sh
        # with yarn
        yarn install --prod=true

        # with npm
        npm install --only=true
        ```

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
