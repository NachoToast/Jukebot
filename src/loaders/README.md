# src / loaders

## What

Designated functions that handle initialisation steps for various parts of the bot.

These functions notably don't just use globals to access things like app config, Discord client, etc... This is because by requiring them as parameters, it's easier to show which functions depends on what (e.g. app config must be loaded before the Discord client is), making things like parallelisation and testing easier.

## Why

Because it's more readable than stuffing everything into `index.ts` no?
