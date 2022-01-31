import { Client, Collection, Intents, Interaction } from 'discord.js';
import Colours, { colourCycle } from '../types/Colours';
import commands from '../commands';
import Command from '../types/Command';
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand, Snowflake } from 'discord-api-types';
import { Routes } from 'discord-api-types/v9';
import Config from '../types/Config';
import { FullInteraction, GuildedInteraction } from '../types/Interactions';
import { Jukebox } from '../classes/Jukebox';
import { getConfig } from '../helpers/getConfig';
import { CleanUpReasons } from '../types/Jukebox';
import { Announcer } from '../classes/Announcer';

export class Jukebot {
    public static config: Config = getConfig();

    public readonly devMode: boolean;
    public readonly client: Client<true>;
    private readonly _commands: Collection<string, Command> = new Collection();
    private readonly _startTime = Date.now();

    private readonly _jukeboxes: Collection<Snowflake, Jukebox> = new Collection();
    private _announcer?: Announcer;

    public constructor() {
        this.devMode = process.argv.slice(2).includes('--devmode');
        this.client = new Client({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
        });

        this._removeJukebox = this._removeJukebox.bind(this);

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

            if (this.devMode) {
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
        const timeout = Jukebot.config.readyTimeout
            ? setTimeout(() => {
                  console.log(`took too long to login (max ${Jukebot.config.readyTimeout}s)`);
                  process.exit(1);
              }, Jukebot.config.readyTimeout * 1000)
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

        this.client.user.setActivity(Jukebot.config.activityString, { type: 'LISTENING' });

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
        if (this.devMode) await this.guildDeploy(token, toDeploy);
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

        for (const [guildId] of allGuilds) {
            const guild = await allGuilds.get(guildId)?.fetch();
            if (!guild) continue;

            try {
                await rest.put(Routes.applicationGuildCommands(this.client.user.id, guildId), { body });
                console.log(`deployed slash commands to ${Colours.FgMagenta}${guild.name}${Colours.Reset}`);
            } catch (error) {
                console.log(error);
            }
        }

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body: [] });
        } catch (error) {
            console.log(error);
            process.exit(1);
        }
    }

    /** Deploys slash commands globally, and make announcer. */
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

        this._announcer = new Announcer(this.client.guilds);
    }

    public getOrMakeJukebox(interaction: FullInteraction): Jukebox {
        const existingBlock = this.getJukebox(interaction);
        if (existingBlock) return existingBlock;

        const newBlock = new Jukebox(interaction, this._removeJukebox);
        this._jukeboxes.set(interaction.guildId, newBlock);
        return newBlock;
    }

    public getJukebox(interaction: GuildedInteraction): Jukebox | undefined {
        return this._jukeboxes.get(interaction.guildId);
    }

    /** Used internally by Jukebox instances wanting to kill themselves. */
    private _removeJukebox(guildId: Snowflake): boolean {
        return this._jukeboxes.delete(guildId);
    }

    /** Attempts to delete a Jukebox from the tracked collection.
     * @param {GuildedInteraction} interaction The interaction this request originated from.
     * @returns {boolean} Whether the deletion was successful.
     */
    public async removeJukebox(interaction: GuildedInteraction): Promise<boolean> {
        const jukebox = this._jukeboxes.get(interaction.guildId);
        if (!jukebox) return false;
        return await jukebox.cleanup(CleanUpReasons.ClientRequest);
    }
}
