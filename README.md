# Jukebot <!-- omit in toc -->

[![CI](https://github.com/NachoToast/Jukebot/actions/workflows/node.js.ci.yml/badge.svg)](https://github.com/NachoToast/Jukebot/actions/workflows/node.js.ci.yml)
[![CodeQL](https://github.com/NachoToast/Jukebot/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/NachoToast/Jukebot/actions/workflows/codeql-analysis.yml)
[![Deploy](https://github.com/NachoToast/Jukebot/actions/workflows/deploy.yml/badge.svg)](https://github.com/NachoToast/Jukebot/actions/workflows/deploy.yml)

A Minecraft-themed music streaming Discord bot.

## Table of Contents <!-- omit in toc -->

- [Technologies](#technologies)
- [Installation](#installation)
- [Documentation](#documentation)
  - [Script Reference](#script-reference)
  - [Dependency Reference](#dependency-reference)

### Technologies

<div style="display: flex">

  <a href="https://nodejs.org/">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  </a>

  <a href="https://www.typescriptlang.org/">
  <img alt="Typescript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  </a>

</div>

### Installation

See the [installation guide](.github/docs/installationGuide.md).

### Documentation

#### Script Reference

-   `start` Starts bot with hot-reloading enabled.
-   `build` Compiles bot into JavaScript.
-   `lint` Makes sure code follows style rules.
-   `typecheck` Makes sure there are no type errors in the code.
-   `test` Runs tests.
-   `check-all` Does linting, typechecking, and testing. Note that this requires pnpm.
-   `auth` Initiates YouTube/Spotify login process.

#### Dependency Reference

-   `@discordjs/opus` Opus bindings for Node.
-   `@discordjs/voice` Discord voice API wrapper.
-   `dayjs` Helps displaying relative times.
-   `discord.js` Discord API wrapper.
-   `play-dl` Searching, downloading, and streaming of music.
-   `sodium-native` Audio encryption library, improves performance.
