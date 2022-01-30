# JukeBot

A music streaming Discord bot by NachoToast.

<!-- To add Jukebot to your server, [click here](). -->

## Installation

See the [installation guide](./.github/installationGuide.md) for a more beginner-friendly walkthrough.

<details open>

<summary>Installing Jukebot</summary>
<br >

-   Node v16.13.0 or greater
-   Scopes
    -   bot
    -   applications.commands
-   Permissions
    -   Send Messages
    -   Speak
    -   Embed Links
-   Gateway Intents
    -   None
-   Put your bot token in [`auth.json`](./auth.json)
    -   See [auth.example.json](./auth.example.json) for syntax.
    -   `yarn dev` uses `devToken`, otherwise `token` is used.

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
