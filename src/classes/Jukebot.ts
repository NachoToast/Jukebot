import {
    Client,
    Collection,
    GuildMember,
    GatewayIntentBits,
    Interaction,
    ActivityType,
    InteractionType,
    RESTPostAPIApplicationCommandsJSONBody as RawSlashCommand,
    Routes,
    Snowflake,
    VoiceState,
} from 'discord.js';
import { chooseRandomArtist } from '../functions/chooseRandomArtist';
import { getVersion } from '../functions/getVersion';
import { Colours } from '../types/Colours';
import { commands } from '../commands';
import { colourCycler } from '../functions/colourCycler';
import { REST } from '@discordjs/rest';
import { Command } from './template/Command';
import { Config } from '../global/Config';
import { JukebotInteraction } from '../types/JukebotInteraction';
import { Loggers } from '../global/Loggers';
import { Jukebox } from './Jukebox';
import { JukeboxProps, StatusTiers } from './Jukebox/types';
import { Devmode } from '../global/Devmode';

export class Jukebot {
    public readonly client: Client<true>;
    public readonly startTime: number = Date.now();

    public readonly commands: Collection<string, Command> = new Collection();

    private readonly _jukeboxes: Collection<Snowflake, Jukebox> = new Collection();

    public constructor(token: string) {
        Loggers.info.log(`Jukebot ${getVersion()} starting`);

        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
        });

        this.login(token);
    }

    private async login(token: string): Promise<void> {
        this.client.once(`ready`, () => this.onReady(token));
        this.client.on(`interactionCreate`, (interaction) => this.onInteractionCreate(interaction));
        this.client.on<`voiceStateUpdate`>(`voiceStateUpdate`, (oldS, newS) => this.onVoiceStateChange(oldS, newS));

        const loginTimeout = Config.timeoutThresholds.discordLogin
            ? setTimeout(() => {
                  Loggers.error.log(`Took too long to login (max ${Config.timeoutThresholds.discordLogin}s)`);
                  process.exit(1);
              }, Config.timeoutThresholds.discordLogin * 1000)
            : null;

        try {
            await this.client.login(token);
            if (loginTimeout) clearTimeout(loginTimeout);
        } catch (error) {
            if (error instanceof Error && error.name === `Error [TOKEN_INVALID]`) {
                Loggers.error.log(`Invalid token in ${Colours.FgMagenta}auth.json${Colours.Reset} file`);
            } else {
                Loggers.error.log(`login Error`, error);
            }
            process.exit(1);
        }
    }

    private async onReady(token: string): Promise<void> {
        Loggers.info.log(
            `${this.client.user.tag} logged in (${Colours.FgMagenta}${Date.now() - this.startTime}ms${Colours.Reset})`,
        );

        const activityFunction = () => {
            this.client.user.setActivity(chooseRandomArtist(), { type: ActivityType.Playing });
        };

        activityFunction();
        if (Config.statusTimePeriod) {
            setInterval(activityFunction, 1000 * Config.statusTimePeriod);
        }

        // loading commands
        const toDeploy: RawSlashCommand[] = new Array(commands.length);
        const cycler = colourCycler();
        const output: string[] = new Array(commands.length + 1);
        output[0] = `Loading ${commands.length} Commands: `;

        for (let i = 0, len = commands.length; i < len; i++) {
            const instance = new commands[i]();
            this.commands.set(instance.name, instance);
            toDeploy[i] = instance.build().toJSON() as RawSlashCommand;

            output[i + 1] = `${cycler.next().value}${commands[i].name}${Colours.Reset}, `;
        }

        Loggers.info.log(output.join(``));

        if (Devmode) await this.guildDeploy(token, toDeploy);
        else await this.globalDeploy(token, toDeploy);

        const finalOutput = `Jukebot ${Colours.FgMagenta}${getVersion()}${Colours.Reset} started`;
        if (!Devmode) {
            console.log(finalOutput);
        }
        Loggers.info.log(finalOutput);
    }

    /** Deploys slash commands locally and removes globally deployed commands. */
    private async guildDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const allGuilds = await this.client.guilds.fetch();

        const rest = new REST({ version: `9` }).setToken(token);

        for (const [guildId] of allGuilds) {
            const guild = await allGuilds.get(guildId)?.fetch();
            if (!guild) {
                Loggers.error.log(`Unable to fetch guild ${Colours.FgMagenta}${guildId}${Colours.Reset}`);
                continue;
            }

            try {
                await rest.put(Routes.applicationGuildCommands(this.client.user.id, guildId), { body });
                Loggers.info.log(
                    `Deployed ${body.length} slash commands to ${Colours.FgMagenta}${guild.name}${Colours.Reset}`,
                );
            } catch (error) {
                Loggers.error.log(`putApplicationGuildCommands Error`, error);
            }
        }

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body: [] });
        } catch (error) {
            Loggers.error.log(`putApplicationCommands Error`, error);
            process.exit(1);
        }
    }

    /** Deploys slash commands globally. */
    private async globalDeploy(token: string, body: RawSlashCommand[]): Promise<void> {
        const rest = new REST({ version: `9` }).setToken(token);

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body });
            Loggers.info.log(
                `Deployed ${body.length} slash commands to ${Colours.FgMagenta}${this.client.guilds.cache.size}${Colours.Reset} guilds`,
            );
        } catch (error) {
            Loggers.error.log(`globalDeploy Error`, error);
            process.exit(1);
        }
    }

    private async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (interaction.type !== InteractionType.ApplicationCommand || !interaction.inGuild()) return;

        if (!(interaction.member instanceof GuildMember)) return;
        if (interaction.guild === null || interaction.channel === null) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute({ interaction: interaction as JukebotInteraction, jukebot: this });
        } catch (error) {
            Loggers.error.log(`interactionCreate Error`, {
                error,
                command: command.name,
                interaction: {
                    id: interaction.id,
                    member: { id: interaction.member.id, name: interaction.member.displayName },
                },
            });
        }
    }

    private onVoiceStateChange(oldState: VoiceState, newState: VoiceState): void {
        // we only care about when a voice channel changes (i.e. leaving, joining, and moving VCs)
        // this guard clause ignores other reasons, e.g. a user muting themselves
        if (oldState.channel?.id === newState.channel?.id) return;

        if (oldState.member === null) {
            // not sure when this would ever happen
            Loggers.warn.log(`[VoiceStateChange] No member`, {
                guild: { id: oldState.guild.id, name: oldState.guild.name },
                newChannel: { id: newState.channel?.id, name: newState.channel?.name },
                oldChannel: { id: oldState.channel?.id, name: oldState.channel?.name },
            });
            return;
        }
        if (oldState.guild.members.me === null) {
            // somehow Jukebot wasn't in this guild
            Loggers.warn.log(`[VoiceStateChange] Not in this guild`, {
                guild: { id: oldState.guild.id, name: oldState.guild.name },
                newChannel: { id: newState.channel?.id, name: newState.channel?.name },
                oldChannel: { id: oldState.channel?.id, name: oldState.channel?.name },
            });
            return;
        }

        if (oldState.member.id === oldState.guild.members.me.id && newState.channel !== null) {
            // if Jukebot moved to a new voice channel, update accordingly
            const jukebox = this.getJukebox(oldState.guild.id);
            if (jukebox) jukebox.handleChannelDrag(newState.channel);
            else {
                Loggers.warn.log(`[VoiceStateChange] Jukebot moved but no instance tracked`, {
                    guild: { id: oldState.guild.id, name: oldState.guild.name },
                    newChannel: { id: newState.channel?.id, name: newState.channel?.name },
                    oldChannel: { id: oldState.channel?.id, name: oldState.channel?.name },
                });
            }
            return;
        }

        const jukebox = this.getJukebox(oldState.guild.id);

        if (jukebox !== undefined) {
            // if we have a jukebox in this guild

            if (
                jukebox.voiceChannel.id === oldState.channel?.id && // and its in the channel that the user left, and
                jukebox.status.tier === StatusTiers.Active // it was playing something
            ) {
                // check to make sure there's still people listening to its music
                jukebox.handleListenerLeave();
                return;
            } else if (
                jukebox.voiceChannel.id === newState.channel?.id && // & it is in the channel that the user joined, and
                jukebox.status.tier === StatusTiers.Idle // it is idling
            ) {
                jukebox.handleListenerJoin();
                return;
            }
        }
    }

    public getJukebox(guildId: Snowflake): Jukebox | undefined {
        return this._jukeboxes.get(guildId);
    }

    public getOrMakeJukebox(props: JukeboxProps): Jukebox {
        const existing = this._jukeboxes.get(props.interaction.guildId);
        if (existing !== undefined) return existing;

        const jukebox = new Jukebox(props);

        if (Devmode) {
            jukebox.events.on(`stateChange`, (oldS, newS) => {
                console.log(`[${props.interaction.guild.name}] ${oldS.tier} -> ${newS.tier}`);
            });
        }

        jukebox.events.once(`destroyed`, () => {
            this._jukeboxes.delete(props.interaction.guildId);
            jukebox.events.removeAllListeners();
        });

        this._jukeboxes.set(props.interaction.guildId, jukebox);

        return jukebox;
    }

    public getNumJukeboxes(): Record<StatusTiers, number> {
        const output: Record<StatusTiers, number> = {
            [StatusTiers.Active]: 0,
            [StatusTiers.Idle]: 0,
            [StatusTiers.Inactive]: 0,
        };

        for (const [, jukebox] of this._jukeboxes) {
            output[jukebox.status.tier]++;
        }

        return output;
    }
}
