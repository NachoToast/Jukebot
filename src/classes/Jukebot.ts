import { Client, Collection, GuildMember, Intents, Interaction } from 'discord.js';
import { chooseRandomArtist } from '../functions/chooseRandomArtist';
import { getVersion } from '../functions/getVersion';
import { Colours } from '../types/Colours';
import { Logger, DuplicateLogBehaviour } from './template/Logger';
import { RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand, Routes } from 'discord-api-types/v9';

import { commands } from '../commands';
import { colourCycler } from '../functions/colourCycler';
import { REST } from '@discordjs/rest';
import { Command } from './template/Command';
import { Config } from '../Config';
import { JukebotInteraction } from '../types/JukebotInteraction';

export class Jukebot {
    public readonly client: Client<true>;
    public readonly startTime: number = Date.now();
    public readonly devmode: boolean;

    public readonly commands: Collection<string, Command> = new Collection();

    /**
     * Logger for info events, such as:
     *
     * - Unable to login (took to long, invalid token).
     * - Unable to deploy commands (fetching guilds, undeploy).
     */
    public readonly infoLogger: Logger;

    /**
     * Logger for all error events, such as:
     *
     * - Unrecognized interaction.
     * - Command execution error.
     */
    public readonly errorLogger: Logger;

    /**
     * Logger for all warning events, such as:
     *
     * - Missing permissions (deprecation).
     */
    public readonly warnLogger: Logger;

    public constructor(token: string, devmode: boolean) {
        this.devmode = devmode;

        const logBehaviour = devmode ? DuplicateLogBehaviour.Replace : DuplicateLogBehaviour.Append;

        this.infoLogger = new Logger(`info.log`, logBehaviour);
        this.errorLogger = new Logger(`errors.log`, logBehaviour);
        this.warnLogger = new Logger(`warnings.log`, logBehaviour);

        this.infoLogger.log(`Jukebot ${getVersion()} started`);

        this.client = new Client({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
        });

        this.login(token);
    }

    private async login(token: string): Promise<void> {
        this.client.once(`ready`, () => this.onReady(token));
        this.client.on(`interactionCreate`, (interaction) => this.onInteractionCreate(interaction));

        const loginTimeout = Config.maxLoginTime
            ? setTimeout(() => {
                  this.errorLogger.logWithConsole(`Took too long to login (max ${Config.maxLoginTime}s)`);
                  process.exit(1);
              }, Config.maxLoginTime * 1000)
            : null;

        try {
            await this.client.login(token);
            if (loginTimeout) clearTimeout(loginTimeout);
        } catch (error) {
            if (error instanceof Error && error.name === `Error [TOKEN_INVALID]`) {
                this.errorLogger.logWithConsole(`Invalid token in ${Colours.FgMagenta}auth.json${Colours.Reset} file`);
            } else {
                this.errorLogger.logWithConsole(error);
            }
            process.exit(1);
        }
    }

    private async onReady(token: string): Promise<void> {
        this.infoLogger.logWithConsole(
            `${this.client.user.tag} logged in (${Colours.FgMagenta}${Date.now() - this.startTime}ms${Colours.Reset})`,
        );

        const activityFunction = () => {
            this.client.user.setActivity(chooseRandomArtist(), { type: `LISTENING` });
        };

        activityFunction();
        if (Config.statusTimePeriod) {
            setInterval(activityFunction, 1000 * Config.statusTimePeriod);
        }

        // loading commands
        const toDeploy: RawSlashCommand[] = new Array(commands.length);
        const cycler = colourCycler();
        const output: string[] = [`Loading ${commands.length} Commands: `];

        for (let i = 0, len = commands.length; i < len; i++) {
            const instance = new commands[i]();
            this.commands.set(instance.name, instance);
            toDeploy[i] = instance.build().toJSON();

            output.push(`${cycler.next().value}${commands[i].name}${Colours.Reset}, `);
        }

        if (this.devmode) await this.guildDeploy(token, toDeploy);
        else await this.globalDeploy(token, toDeploy);
    }

    /** Deploys slash commands locally and removes globally deployed commands. */
    private async guildDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const allGuilds = await this.client.guilds.fetch();

        const rest = new REST({ version: `9` }).setToken(token);

        for (const [guildId] of allGuilds) {
            const guild = await allGuilds.get(guildId)?.fetch();
            if (!guild) {
                this.errorLogger.logWithConsole(`Unable to fetch guild ${Colours.FgMagenta}${guildId}${Colours.Reset}`);
                continue;
            }

            try {
                await rest.put(Routes.applicationGuildCommands(this.client.user.id, guildId), { body });
                this.infoLogger.logWithConsole(
                    `Deployed ${body.length} slash commands to ${Colours.FgMagenta}${guild.name}${Colours.Reset}`,
                );
            } catch (error) {
                this.errorLogger.logWithConsole(error);
            }
        }

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body: [] });
        } catch (error) {
            this.errorLogger.logWithConsole(error);
            process.exit(1);
        }
    }

    /** Deploys slash commands globally. */
    private async globalDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const rest = new REST({ version: `9` }).setToken(token);

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body });
            this.infoLogger.logWithConsole(
                `Deployed ${body.length} slash commands to ${Colours.FgMagenta}${this.client.guilds.cache.size}${Colours.Reset} guilds`,
            );
        } catch (error) {
            this.errorLogger.logWithConsole(error);
            process.exit(1);
        }
    }

    private async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isCommand() || !interaction.inGuild() || !(interaction.member instanceof GuildMember)) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute({ interaction: interaction as JukebotInteraction, jukebot: this });
        } catch (error) {
            this.errorLogger.log(error);
        }
    }
}
