import { Client, Collection, Intents, Interaction } from 'discord.js';
import { chooseRandomArtist } from '../helpers/chooseRandomArtist';
import { getVersion } from '../helpers/getVersion';
import { Colours } from '../types/Colours';
import { Logger, DuplicateLogBehaviour } from './template/Logger';
import { RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand, Routes } from 'discord-api-types/v9';

import { UtilCommands } from '../commands/util';
import { colourCycler } from '../helpers/colourCycler';
import { REST } from '@discordjs/rest';
import { Command } from './template/Command';

export class Jukebot {
    /**
     * Maximum time (in seconds) given to log into Discord.
     *
     * If not logged in after this amount of time, process will exit.
     *
     * Set to 0 for unlimited time.
     */
    public static readonly maxLoginTime: number = 5;

    /** Time (in seconds) between status/activity updates. Setting to 0 disables updates entirely. */
    public static readonly statusTimePeriod: number = 2 * 60;

    public readonly client: Client<true>;
    public readonly startTime: number = Date.now();
    public readonly devmode: boolean;

    public readonly commands: Collection<string, Command> = new Collection();

    public readonly mainLogger: Logger;
    public readonly errorLogger: Logger;

    public constructor(token: string, devmode: boolean) {
        this.devmode = devmode;

        const logBehaviour = devmode ? DuplicateLogBehaviour.Replace : DuplicateLogBehaviour.Append;

        this.mainLogger = new Logger('main', logBehaviour);
        this.errorLogger = new Logger('error', logBehaviour);

        this.mainLogger.log(`Jukebot ${getVersion()} started`);

        this.client = new Client({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
        });

        this.login(token);
    }

    private async login(token: string): Promise<void> {
        this.client.once('ready', () => this.onReady(token));
        this.client.on('interactionCreate', (interaction) => this.onInteractionCreate(interaction));

        const loginTimeout = Jukebot.maxLoginTime
            ? setTimeout(() => {
                  this.mainLogger.logWithConsole(`Took too long to login (max ${Jukebot.maxLoginTime}s)`);
                  process.exit(1);
              }, Jukebot.maxLoginTime * 1000)
            : null;

        try {
            await this.client.login(token);
            if (loginTimeout) clearTimeout(loginTimeout);
        } catch (error) {
            if (error instanceof Error && error.name === 'Error [TOKEN_INVALID]') {
                this.mainLogger.logWithConsole(`Invalid token in ${Colours.FgMagenta}auth.json${Colours.Reset} file`);
            } else {
                this.mainLogger.logWithConsole(error);
            }
            process.exit(1);
        }
    }

    private async onReady(token: string): Promise<void> {
        this.mainLogger.logWithConsole(
            `${this.client.user.tag} logged in (${Colours.FgMagenta}${Date.now() - this.startTime}ms${Colours.Reset})`,
        );

        const activityFunction = () => {
            this.client.user.setActivity(chooseRandomArtist(), { type: 'LISTENING' });
        };

        activityFunction();
        if (Jukebot.statusTimePeriod) {
            setInterval(activityFunction, 1000 * Jukebot.statusTimePeriod);
        }

        // loading commands
        const toDeploy: RawSlashCommand[] = new Array(UtilCommands.length);
        const cycler = colourCycler();
        const output: string[] = [`Loading ${UtilCommands.length} Commands: `];

        for (let i = 0, len = UtilCommands.length; i < len; i++) {
            const instance = new UtilCommands[i]();
            this.commands.set(instance.name, instance);
            toDeploy[i] = instance.build().toJSON();

            output.push(`${cycler.next().value}${UtilCommands[i].name}${Colours.Reset}, `);
        }

        if (this.devmode) await this.guildDeploy(token, toDeploy);
        else await this.globalDeploy(token, toDeploy);
    }

    /** Deploys slash commands locally and removes globally deployed commands. */
    private async guildDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const allGuilds = await this.client.guilds.fetch();

        const rest = new REST({ version: '9' }).setToken(token);

        for (const [guildId] of allGuilds) {
            const guild = await allGuilds.get(guildId)?.fetch();
            if (!guild) {
                this.mainLogger.logWithConsole(`Unable to fetch guild ${Colours.FgMagenta}${guildId}${Colours.Reset}`);
                continue;
            }

            try {
                await rest.put(Routes.applicationGuildCommands(this.client.user.id, guildId), { body });
                this.mainLogger.logWithConsole(
                    `Deployed slash commands to ${Colours.FgMagenta}${guild.name}${Colours.Reset}`,
                );
            } catch (error) {
                this.mainLogger.logWithConsole(error);
            }
        }

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body: [] });
        } catch (error) {
            this.mainLogger.logWithConsole(error);
            process.exit(1);
        }
    }

    /** Deploys slash commands globally. */
    private async globalDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const rest = new REST({ version: '9' }).setToken(token);

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body });
        } catch (error) {
            this.mainLogger.logWithConsole(error);
            process.exit(1);
        }
    }

    private async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isCommand() || !interaction.inGuild()) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute({ interaction, jukebot: this });
        } catch (error) {
            this.errorLogger.log(error);
        }
    }
}
