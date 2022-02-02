To set up your own version of JukeBot, follow these steps

1. Make a Discord Application

    1. Head over to the [Discord Developer Portal](https://discord.com/developers/applications) and make a new application
    2. Go to the Bot section and add a bot
        - Copy the **token** that it generates, you'll need it later.
    3. Go to the OAuth2 > URL Generator section and select
        - Scopes: `bot`, `applications.commands`
        - Bot Permissions: `Send Messages`, `Connect`, `Speak`,
    4. Copy the generated URL and paste it into a new tab to invite your bot to a server

2. Clone this Repository

    1. In VSCode, open the command palette (`CTRL + SHIFT + P`)
    2. Type `git clone` and press enter
    3. Paste the [link](https://github.com/NachoToast/Jukebot) to this repository and press enter again
    4. Select where to put the repository, then open it

3. Create an Authorization File

    1. Copy the [`auth.example.json`](../auth.example.json) file 2. Rename the copy to [`auth.json`](../auth.json) 3. Fill out the `devToken` field with the token from step 1
    2. Run the Spotify authorization script using `yarn spotify` or `npm run spotify`
        1. Fill in your Spotify client ID and secret, the redirect URL doesn't matter so just make it any valid URL.

4. Install Dependencies

    - Open a terminal (`` CTRL + ` `` in VSCode) and use [yarn](https://yarnpkg.com/) (recommended) or `npm` to install dependencies

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
