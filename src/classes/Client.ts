import { Client, Collection, Intents, Interaction, VoiceState } from 'discord.js';
import Colours, { colourCycle } from '../types/Colours';
import commands from '../commands';
import Command from '../types/Command';
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand, Snowflake } from 'discord-api-types';
import { Routes } from 'discord-api-types/v9';
import Config from '../types/Config';
import { FullInteraction, GuildedInteraction } from '../types/Interactions';
import { Jukebox } from './Jukebox';
import { getAuth, getConfig } from '../helpers/getAuthConfig';
import { Announcer } from './Announcer';
import Auth from '../types/Auth';
import { readFileSync } from 'fs';
import path from 'path';
import { chooseRandomArtist } from '../helpers/chooseRandomSong';

export class Jukebot {
    public static config: Config;
    public static auth: Auth;
    public static version: string;

    public readonly devMode: boolean;
    public readonly client: Client<true>;
    private readonly _commands: Collection<string, Command> = new Collection();
    private readonly _startTime = Date.now();

    private readonly _jukeboxes: Collection<Snowflake, Jukebox> = new Collection();

    private static getVersion(): string {
        const easyVersion = process.env.npm_package_version;
        if (easyVersion) return easyVersion;
        const packageJson = JSON.parse(readFileSync(path.join(__dirname, '../', '../', 'package.json'), 'utf-8'));
        const packageVersion = packageJson?.version;
        return packageVersion ?? 'Unknown';
    }

    public constructor() {
        Jukebot.config = getConfig();
        Jukebot.auth = getAuth();
        Jukebot.version = Jukebot.getVersion();

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
        const { token } = Jukebot.auth;

        // add event listeners
        this.client.once('ready', () => this.onReady(token));
        this.client.on('error', (err) => console.log(err));
        this.client.on('interactionCreate', (int) => this.onInteractionCreate(int));
        this.client.on('voiceStateUpdate', (oldState, newState) => this.onVoiceStateChange(oldState, newState));

        // logging in
        const timeout = Jukebot.config.timeoutThresholds.login
            ? setTimeout(() => {
                  console.log(`took too long to login (max ${Jukebot.config.timeoutThresholds.login}s)`);
                  process.exit(1);
              }, Jukebot.config.timeoutThresholds.login * 1000)
            : null;
        try {
            await this.client.login(token);
            if (timeout) clearTimeout(timeout);
        } catch (error) {
            if (error instanceof Error && error.message === 'TOKEN_INVALID') {
                console.log(
                    `invalid ${this.devMode ? 'dev' : ''}token in ${Colours.FgMagenta}auth.json${Colours.Reset} file`,
                );
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

        this.client.user.setActivity(chooseRandomArtist(), { type: 'LISTENING' });

        if (Jukebot.config.timeoutThresholds.statusUpdate) {
            setInterval(() => {
                this.client.user.setActivity(chooseRandomArtist(), { type: 'LISTENING' });
            }, 1000 * Jukebot.config.timeoutThresholds.statusUpdate);
        }

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

        // making announcement
        const devModeAnnouncer = this.devMode && Jukebot.config.announcementSystem.enabledInDevelopment;
        const prodAnnouncer = !this.devMode && Jukebot.config.announcementSystem.enabledInProduction;

        if (devModeAnnouncer || prodAnnouncer) {
            Announcer.init(this.client);
        }
    }

    private async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isCommand()) return;

        const guildedInteraction = interaction as GuildedInteraction;

        const command = this._commands.get(interaction.commandName);
        if (command) {
            if (!interaction.guild?.me && !command.allowNoGuild) {
                await interaction.reply({
                    content: 'Sorry, you can only use this command in a server',
                    ephemeral: true,
                });
                return;
            }

            try {
                await command.execute({ interaction: guildedInteraction, jukebot: this });
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

    private async onVoiceStateChange(oldState: VoiceState, newState: VoiceState): Promise<void> {
        if (!oldState.member) return;

        if (oldState.member.id === oldState.guild.me?.id) {
            // Jukebot changed voice channel
            const jukebox = this.getJukebox(oldState.guild.id);
            if (jukebox) {
                await jukebox.handleVoiceChannelChange(oldState.channel, newState.channel);
            }
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
    }

    /** Gets an existing Jukebox, or makes one if nonexistent. */
    public getOrMakeJukebox(interaction: FullInteraction): Jukebox {
        const existingBlock = this.getJukebox(interaction.guildId);
        if (existingBlock) return existingBlock;

        const newBlock = new Jukebox(interaction, (guildId) => this._removeJukebox(guildId));
        this._jukeboxes.set(interaction.guildId, newBlock);
        return newBlock;
    }

    public getJukebox(guildId: Snowflake): Jukebox | undefined {
        return this._jukeboxes.get(guildId);
    }

    /** Callback from Jukebox instances wanting to kill themselves. */
    private _removeJukebox(guildId: Snowflake): void {
        const deleted = this._jukeboxes.delete(guildId);
        if (!deleted) {
            console.log(
                `Got destroy callback from untracked Jukebox, id ${Colours.FgMagenta}${guildId}${Colours.Reset}`,
            );
        }
    }

    /** Attempts to delete a Jukebox from the tracked collection.
     * @param {Snowflake} guildId The guild ID of the known Jukebox instance.
     */
    public removeJukebox(guildId: Snowflake): void {
        return this._jukeboxes.get(guildId)?.cleanup();
    }
}
