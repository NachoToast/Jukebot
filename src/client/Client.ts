import { Client as DiscordClient, Collection, Interaction } from 'discord.js';
import Colours, { colourCycle } from '../types/Colours';
import intents from './Intents';
import commands from '../commands';
import Command from '../types/Command';
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand } from 'discord-api-types';
import { Routes } from 'discord-api-types/v9';
import Config from '../types/Config';

export class Client extends DiscordClient {
    public readonly devMode: boolean = process.argv.slice(2).includes('--devmode');
    public readonly config: Config;
    public readonly commands: Collection<string, Command> = new Collection();

    private readonly _startTime = Date.now();

    public constructor() {
        super({ intents });

        // loading config
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const config: Config = require('../../config.json');
            this.config = config;
        } catch (error) {
            if (error instanceof Error && error.message.includes('config.json')) {
                console.log(`Missing ${Colours.FgMagenta}config.json${Colours.Reset} file in root directory`);
            } else {
                console.log('Unknown error occurred trying to read config');
                console.log(error);
            }
            process.exit();
        }

        this.on('ready', this.onReady);
        this.on('error', () => console.log('uh oh'));
        this.on('interactionCreate', (int) => this.onInteractionCreate(int));
        this.tryLogin();
    }

    private async tryLogin(): Promise<void> {
        try {
            let token: string;

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { token: prodToken, devToken } = require('../../auth.json');
            if (this.devMode) {
                if (!devToken) {
                    console.log(
                        `Running in devmode with no auth token, add a ${Colours.FgCyan}devToken${Colours.Reset} field to the ${Colours.FgMagenta}auth.json${Colours.Reset} file.`,
                    );
                    process.exit();
                }
                token = devToken;
            } else {
                if (!prodToken) {
                    console.log(
                        `Running with no auth token, add a ${Colours.FgCyan}token${Colours.Reset} field to the ${Colours.FgMagenta}auth.json${Colours.Reset} file.`,
                    );
                    process.exit();
                }
                token = prodToken;
            }

            await this.login(token);

            this.loadCommands(token);
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'Error [TOKEN_INVALID]') {
                    console.log(`Invalid token in ${Colours.FgMagenta}auth.json${Colours.Reset} file`);
                } else if (error.message.includes('auth.json')) {
                    console.log(`Missing ${Colours.FgMagenta}auth.json${Colours.Reset} file in root directory`);
                } else {
                    console.log('Unknown error occurred trying to log in');
                    console.log(error);
                }
            } else {
                console.log('Unknown error occurred trying to log in');
                console.log(error);
            }
            process.exit();
        }
    }

    public get id(): string {
        return this.user?.id || '';
    }

    private async onReady(): Promise<void> {
        if (!this.user) {
            console.log(`Unable to log in as user, ${Colours.FgRed}this should never happen!${Colours.Reset}`);
            process.exit();
        }

        console.log(
            `${this.user.tag} logged in (${Colours.FgMagenta}${(Date.now() - this._startTime) / 1000}s${
                Colours.Reset
            })`,
        );

        this.user.setActivity('sus remixes', { type: 'LISTENING' });
    }

    private async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isCommand()) return;
        const command = this.commands.get(interaction.commandName);
        if (command) {
            await command.execute({ interaction, client: this });
        } else {
            interaction.reply(`Command ${interaction.commandName} not found, please report this to NachoToast`);
        }
    }

    private async loadCommands(token: string): Promise<void> {
        // command loading...
        process.stdout.write(`Loading ${commands.length} Command${commands.length !== 1 ? 's' : ''}: `);

        // const duplicateCommandsMessage: string[] = [];
        const colourCycler = colourCycle();
        const deployableCommands: RawSlashCommand[] = [];

        commands.map((command) => {
            this.commands.set(command.name, command);
            deployableCommands.push(command.build(this).toJSON());

            const colour = colourCycler.next().value;

            process.stdout.write(`${colour}${command.name}${Colours.Reset}, `);
        });

        process.stdout.write('\n');

        if (this.devMode) {
            this.deployToGuild(token, deployableCommands);
        } else {
            this.deployToGlobal(token, deployableCommands);
        }
    }

    private async deployToGuild(token: string, body: RawSlashCommand[]): Promise<void> {
        const allGuilds = await this.guilds.fetch();

        const rest = new REST({ version: '9' }).setToken(token);

        for (const [guildID] of allGuilds) {
            const guild = await allGuilds.get(guildID)?.fetch();
            if (!guild) continue;

            try {
                await rest.put(Routes.applicationGuildCommands(this.id, guildID), { body });
                console.log(
                    `Successfully deployed slash commands to ${Colours.FgMagenta}${guild.name}${Colours.Reset}`,
                );
            } catch (error) {
                console.log(`Failed to deploy slash commands to ${Colours.FgRed}${guild.name}${Colours.FgRed}`);
            }
        }

        // await rest.put(Routes.applicationGuildCommands(this.id));
    }

    private async deployToGlobal(token: string, body: RawSlashCommand[]): Promise<void> {
        // TODO: load global commands
        const rest = new REST({ version: '9' }).setToken(token);

        try {
            await rest.put(Routes.applicationCommands(this.id), { body });
        } catch (error) {
            console.log('Failed to deploy slash commands globally');
            process.exit();
        }
    }
}

export default Client;
