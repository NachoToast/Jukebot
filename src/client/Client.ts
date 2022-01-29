import { Client, Collection, Interaction } from 'discord.js';
import Colours, { colourCycle } from '../types/Colours';
import intents from './Intents';
import commands from '../commands';
import Command from '../types/Command';
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand, Snowflake } from 'discord-api-types';
import { Routes } from 'discord-api-types/v9';
import Config from '../types/Config';
import { FullInteraction, GuildedInteraction } from '../types/Interactions';
import { Jukebox } from '../classes/Jukebox';

export class Jukebot {
    public readonly _devMode: boolean;
    public readonly client: Client<true>;
    public readonly config: Config;
    private readonly _commands: Collection<string, Command> = new Collection();
    private readonly _startTime = Date.now();

    private readonly _jukeboxes: Collection<Snowflake, Jukebox> = new Collection();

    public constructor() {
        this._devMode = process.argv.slice(2).includes('--devmode');
        this.client = new Client({ intents });

        // loading config
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const config: Config = require('../../config.json');
            this.config = config;
        } catch (error) {
            if (error instanceof Error && error.message.includes('config.json')) {
                console.log(`missing ${Colours.FgMagenta}config.json${Colours.Reset} file in root directory`);
            } else console.log(error);
            process.exit(1);
        }

        this.start();
    }

    /** Attempts to log the client in, exiting the process if unable to do so. */
    private async start(): Promise<void> {
        // not done in the constructor, since logging in is an asynchronous process
        let loginToken: string;

        // loading auth
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { token, devToken } = require('../../auth.json');

            if (this._devMode) {
                if (!devToken) throw new Error('devNoAuth');
                loginToken = devToken;
            } else {
                if (!token) throw new Error('prodNoAuth');
                loginToken = token;
            }
        } catch (error) {
            const isInstance = error instanceof Error;
            if (isInstance && error.message.includes('auth.json')) {
                console.log(`missing ${Colours.FgMagenta}auth.json${Colours.Reset} file in root directory`);
            } else if (isInstance && error.message === 'devNoAuth') {
                console.log(
                    `running in devmode with no auth token, add a ${Colours.FgCyan}devToken${Colours.Reset} field to the ${Colours.FgMagenta}auth.json${Colours.Reset} file`,
                );
            } else if (isInstance && error.message === 'prodNoAuth') {
                console.log(
                    `running with no auth token, add a ${Colours.FgCyan}token${Colours.Reset} field to the ${Colours.FgMagenta}auth.json${Colours.Reset} file`,
                );
            } else console.log(error);
            process.exit(1);
        }

        // add event listeners
        this.client.once('ready', () => this.onReady(loginToken));
        this.client.on('error', (err) => console.log(err));
        this.client.on('interactionCreate', (int) => this.onInteractionCreate(int));

        // logging in
        const timeout = this.config.readyTimeout
            ? setTimeout(() => {
                  console.log(`took too long to login (max ${this.config.readyTimeout}s)`);
                  process.exit(1);
              }, this.config.readyTimeout * 1000)
            : null;
        try {
            await this.client.login(loginToken);
            if (timeout) clearTimeout(timeout);
        } catch (error) {
            if (error instanceof Error && error.message === 'TOKEN_INVALID') {
                console.log(`invalid token in ${Colours.FgMagenta}auth.json${Colours.Reset} file`);
            } else console.log(error);
            process.exit(1);
        }
    }

    private async onReady(token: string): Promise<void> {
        console.log(
            `${this.client.user.tag} logged in (${Colours.FgMagenta}${(Date.now() - this._startTime) / 1000}s${
                Colours.Reset
            })`,
        );

        this.client.user.setActivity('sus remixes', { type: 'LISTENING' });

        // loading commands
        process.stdout.write(`Loading ${commands.length} Command${commands.length !== 1 ? 's' : ''}: `);
        const colourCycler = colourCycle();
        const toDeploy: RawSlashCommand[] = [];
        commands.map((command) => {
            this._commands.set(command.name, command);
            toDeploy.push(command.build(this).toJSON());

            const colour = colourCycler.next().value;
            process.stdout.write(`${colour}${command.name}${Colours.Reset}, `);
        });
        process.stdout.write('\n');

        // deploying commands
        if (this._devMode) await this.guildDeploy(token, toDeploy);
        else await this.globalDeploy(token, toDeploy);
    }

    private async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isCommand()) return;
        const command = this._commands.get(interaction.commandName);
        if (command) {
            try {
                await command.execute({ interaction, jukebot: this });
            } catch (error) {
                console.log(error);
            }
        } else {
            await interaction.reply({
                content: `I don't have a command called ${interaction.commandName}, please report this error to NachoToast`,
                ephemeral: true,
            });
        }
    }

    /** Deploys slash commands to all guilds individually. */
    private async guildDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const allGuilds = await this.client.guilds.fetch();

        const rest = new REST({ version: '9' }).setToken(token);

        for (const [guildID] of allGuilds) {
            const guild = await allGuilds.get(guildID)?.fetch();
            if (!guild) continue;

            try {
                await rest.put(Routes.applicationGuildCommands(this.client.user.id, guildID), { body });
                console.log(`deployed slash commands to ${Colours.FgMagenta}${guild.name}${Colours.Reset}`);
            } catch (error) {
                console.log(error);
            }
        }
    }

    /** Deploys slash commands globally. */
    private async globalDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const rest = new REST({ version: '9' }).setToken(token);

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), {
                body,
            });
        } catch (error) {
            console.log(error);
            process.exit(1);
        }
    }

    public getOrMakeJukebox(interaction: FullInteraction): Jukebox {
        const existingBlock = this.getJukebox(interaction);
        if (existingBlock) return existingBlock;

        const newBlock = new Jukebox(interaction);
        this._jukeboxes.set(interaction.guildId, newBlock);
        return newBlock;
    }

    public getJukebox(interaction: GuildedInteraction): Jukebox | undefined {
        return this._jukeboxes.get(interaction.guildId);
    }
}
