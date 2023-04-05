import {
    Client,
    OAuth2Guild,
    REST,
    RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand,
    Routes,
    SlashCommandBuilder,
} from 'discord.js';
import { commands } from '../commands';
import { JukebotGlobals } from '../global';
import { Colours } from '../types';

/** Handles deploying and undeploying of slash commands to Discord. */
export class CommandDeployer {
    private readonly _client: Client<true>;
    private readonly _rest: REST = new REST({ version: '9' }).setToken(JukebotGlobals.config.discordToken);
    private readonly _commands: RawSlashCommand[] = [];

    private get _applicationId(): string {
        return this._client.user.id;
    }

    public constructor(client: Client<true>) {
        this._client = client;
        this._commands = commands.map((e) => {
            const command = new SlashCommandBuilder().setName(e.name).setDescription(e.description);
            e.build?.(command);
            command.setDMPermission(false);
            return command.toJSON();
        });
    }

    /**
     * Does guild and global deployment/undeployments depending on whether the application is running in development
     * mode.
     */
    public async autoDeploy(): Promise<void> {
        if (JukebotGlobals.devmode) {
            await Promise.all([this.deployToAllGuilds(), this.undeployGlobally()]);
        } else {
            await this.deployGlobally();
        }
    }

    /** Deploys slash commands globally. */
    public async deployGlobally(): Promise<void> {
        try {
            await this._rest.put(Routes.applicationCommands(this._applicationId), { body: this._commands });
            console.log(`Deployed ${this._commands.length} slash commands globally`);
        } catch (error) {
            console.log('Failed to deploy slash commands globally', error);
        }
    }

    /** Undeploys slash commands globally. */
    public async undeployGlobally(): Promise<void> {
        try {
            await this._rest.put(Routes.applicationCommands(this._applicationId), { body: [] });
        } catch (error) {
            console.log('Failed to undeploy slash commands globally', error);
        }
    }

    /** Deploys slash commands to a single guild. */
    public async deployToGuild(guildId: string, guild?: OAuth2Guild): Promise<void> {
        const guildNameInLog = `${Colours.FgMagenta}${guild?.name ?? guildId}${Colours.Reset}`;

        try {
            await this._rest.put(Routes.applicationGuildCommands(this._applicationId, guildId), {
                body: this._commands,
            });
            console.log(`Deployed slash commands to ${guildNameInLog}`);
        } catch (error) {
            console.log(`Failed to deploy slash commands to guild ${guildNameInLog}`, error);
        }
    }

    /** Undeploys slash commands from a single guild. */
    public async undeployFromGuild(guildId: string, guild?: OAuth2Guild): Promise<void> {
        const guildNameInLog = `${Colours.FgMagenta}${guild?.name ?? guildId}${Colours.Reset}`;

        try {
            await this._rest.put(Routes.applicationGuildCommands(this._applicationId, guildId), {
                body: [],
            });
            console.log(`Undeployed slash commands from ${guildNameInLog}`);
        } catch (error) {
            console.log(`Failed to undeploy slash commands from guild ${guildNameInLog}`, error);
        }
    }

    /** Deploys slash commands individually to each guild the bot is in. */
    public async deployToAllGuilds(): Promise<void> {
        const allGuilds = await this._client.guilds.fetch();

        for (const [guildId, guild] of allGuilds) {
            await this.deployToGuild(guildId, guild);
        }

        console.log(`Deployment to guilds finished (${allGuilds.size} total)`);
    }

    /** Undeploys slash commands individually from each guild the bot is in. */
    public async undeployFromAllGuilds(): Promise<void> {
        const allGuilds = await this._client.guilds.fetch();

        for (const [guildId, guild] of allGuilds) {
            await this.undeployFromGuild(guildId, guild);
        }

        console.log(`Undeployment from guilds finished (${allGuilds.size} total)`);
    }
}
