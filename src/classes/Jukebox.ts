import { AudioPlayer, VoiceConnection, VoiceConnectionStatus, joinVoiceChannel } from '@discordjs/voice';
import { ChatInputCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { JukebotGlobals } from '../global';
import { connectionEntersState } from '../util';
import { Hopper } from './Hopper';

export class Jukebox {
    private static readonly _guildMap: Map<string, Jukebox> = new Map();

    private readonly _origin: ChatInputCommandInteraction;
    private readonly _previousQueue: Hopper = new Hopper(JukebotGlobals.config.previousQueueSize);
    private readonly _upcomingQueue: Hopper = new Hopper(JukebotGlobals.config.maxQueueSize);

    private _targetVoiceChannel: VoiceBasedChannel;
    private _connection?: VoiceConnection;
    private _player?: AudioPlayer;

    private constructor(origin: ChatInputCommandInteraction, targetVoiceChannel: VoiceBasedChannel) {
        this._origin = origin;
        this._targetVoiceChannel = targetVoiceChannel;
    }

    /** Returns the target voice channel of the bot, but only if it is connected to it. */
    public getTargetVoiceChannel(): VoiceBasedChannel | undefined {
        if (this._connection === undefined) return;
        return this._targetVoiceChannel;
    }

    /** This will destroy the current connection, but not remake it. */
    public setTargetVoiceChannel(newTarget: VoiceBasedChannel): void {
        this._targetVoiceChannel = newTarget;
        this.destroyConnection();
    }

    public async connectToTarget(origin: ChatInputCommandInteraction) {
        const connection = joinVoiceChannel({
            channelId: this._targetVoiceChannel.id,
            guildId: this._targetVoiceChannel.guild.id,
            adapterCreator: this._targetVoiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        connection.on('error', (error) => {
            origin.followUp({ content: `Connection error: ${error.message}` }).catch(() => null);
            this.destroyConnection();
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => this.destroyConnection());

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                console.log('disconnected, waiting for re-ready');
                await connectionEntersState(connection, VoiceConnectionStatus.Ready, this._targetVoiceChannel);
            } catch (error) {
                this.destroyConnection();
            }
        });

        try {
            await connectionEntersState(connection, VoiceConnectionStatus.Ready, this._targetVoiceChannel);
            this._connection = connection;
        } catch (error) {
            this.destroyConnection();
            throw error;
        }
    }

    public destroyConnection() {
        if (this._connection === undefined) return;
        this._connection.removeAllListeners();
        this._connection.destroy();
        delete this._connection;
    }

    public handleDragged(newVoiceChannel: VoiceBasedChannel): void {
        this._targetVoiceChannel = newVoiceChannel;
    }

    public getHasListenersInVoice(): boolean {
        return this._targetVoiceChannel.members.some((e) => !e.user.bot && !e.voice.selfDeaf && !e.voice.serverDeaf);
    }

    public static getJukebox(guildId: string): Jukebox | undefined {
        return Jukebox._guildMap.get(guildId);
    }

    public static makeJukebox(origin: ChatInputCommandInteraction, targetVoiceChannel: VoiceBasedChannel): Jukebox {
        const jukebox = new Jukebox(origin, targetVoiceChannel);
        Jukebox._guildMap.set(targetVoiceChannel.guild.id, jukebox);
        return jukebox;
    }

    public static getOrMakeJukebox(
        origin: ChatInputCommandInteraction,
        targetVoiceChannel: VoiceBasedChannel,
    ): Jukebox {
        const jukebox = Jukebox.getJukebox(targetVoiceChannel.guild.id);
        if (jukebox !== undefined) return jukebox;
        return Jukebox.makeJukebox(origin, targetVoiceChannel);
    }

    public static destroyJukebox(guildId: string): void {
        const jukebox = Jukebox.getJukebox(guildId);
        if (jukebox === undefined) return;
        // TODO: call destroy method of instance here
        Jukebox._guildMap.delete(guildId);
    }
}
