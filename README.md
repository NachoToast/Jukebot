# JukeBot

A music streaming Discord bot by NachoToast.

<!-- To add Jukebot to your server, [click here](). -->

## Installation

See the [installation guide](./docs/installationGuide.md) for a more beginner-friendly walkthrough.

##### Dependencies

-   [Node](https://nodejs.org/en/) v16.13.0 or greater
-   [FFMPEG](https://www.ffmpeg.org/)

##### Install

```sh
# with yarn
yarn

# with npm
npm install
```

Add Discord Token

```sh
# Put your bot token here (see auth.example.json)
$ touch auth.json
```

###### Scopes

-   bot
-   applications.commands

###### Permissions

-   Send Messages
-   Speak
-   Embed Links

###### Gateway Intents

-   None

To set up your own version of JukeBot, follow these steps

1. Make a Discord Application

    1. Head over to the [Discord Developer Portal](https://discord.com/developers/applications) and make a new application
    2. Go to the Bot section and add a bot
        - Copy the **token** that it generates, you'll need it later.
    3. Go to the OAuth2 > URL Generator section and select
        - Scopes: `bot`, `applications.commands`
        - Bot Permissions: `Send Messages`, `Speak`, `Embed Links`
    4. Copy the generated URL and paste it into a new tab to invite your bot to a server

2. Clone this Repository

    1. In VSCode, open the command palette (`CTRL + SHIFT + P`)
    2. Type `git clone` and press enter
    3. Paste the [link](https://github.com/NachoToast/Jukebot) to this repository and press enter again
    4. Select where to put the repository, then open it

3. Create an Authorization File

    1. Copy the [`auth.example.json`](./auth.example.json) file
    2. Rename the copy to [`auth.json`](./auth.json)
    3. Fill out the `devToken` field with the token from step 1

4. Install Dependencies

    - Open a terminal (`` CTRL + ` `` in VSCode) and use [yarn](https://yarnpkg.com/) (recommended) or `npm` to install dependencies

        ```sh
        # with yarn
        $ yarn

        # with npm
        $ npm install
        ```

    - You can install yarn using:
        ```sh
        $ npm i -g yarn
        ```

5. Start the Bot

    - In development

        ```sh
        # with yarn
        $ yarn dev

        # with npm
        $ npm run dev
        ```

    - In production

        ```sh
        # with yarn
        $ yarn build

        # with npm
        $ npm run build
        ```

        ```sh
        $ node .
        ```
