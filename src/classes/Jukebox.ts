import { FullInteraction } from '../types/Interactions';
import {
    AudioPlayer,
    AudioPlayerState,
    createAudioPlayer,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionState,
} from '@discordjs/voice';
import Colours from '../types/Colours';
import { Hopper } from './Hopper';

/** Each Jukebox instance handles audio playback for a single guild. */
export class Jukebox {
    /** The interaction that created this instance. */
    private readonly _startingInteraction: FullInteraction;
    /** The name of the guild of the `_startingInteraction`, for simplified logging. */
    private readonly _name: string;

    /** The latest interaction that caused this instance to join or move to a voice channel. */
    private _latestInteraction: FullInteraction;

    public hopper: Hopper;

    private _connection: VoiceConnection;
    private _player: AudioPlayer;

    public constructor(interaction: FullInteraction) {
        this._startingInteraction = interaction;
        this._latestInteraction = interaction;

        this._name = interaction.guild.name;
        this.hopper = new Hopper();

        this.handleConnectionError = this.handleConnectionError.bind(this);
        this.handleConnectionStateChange = this.handleConnectionStateChange.bind(this);

        this.handlePlayerError = this.handlePlayerError.bind(this);
        this.handlePlayerStateChange = this.handlePlayerStateChange.bind(this);

        this._connection = joinVoiceChannel({
            channelId: this._latestInteraction.member.voice.channelId,
            guildId: this._latestInteraction.guildId,
            adapterCreator: this._latestInteraction.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        this._connection.on('error', this.handleConnectionError);
        this._connection.on('stateChange', this.handleConnectionStateChange);

        this._player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });

        this._player.on('error', this.handlePlayerError);
        this._player.on('stateChange', this.handlePlayerStateChange);

        this._connection.subscribe(this._player);
    }

    private handleConnectionError(error: Error): void {
        console.log(`[${this._name}] (connection) ${Colours.FgRed}error${Colours.Reset}`, error);
    }

    private handleConnectionStateChange(
        { status: oldStatus }: VoiceConnectionState,
        { status: newStatus }: VoiceConnectionState,
    ): void {
        if (oldStatus === newStatus) return;
        console.log(`[${this._name}] (connection) ${oldStatus} => ${newStatus}`);
    }

    private handlePlayerError(error: Error): void {
        console.error(`[${this._name}] (player) ${Colours.FgRed}error${Colours.Reset}`, error);
    }

    private handlePlayerStateChange(
        { status: oldStatus }: AudioPlayerState,
        { status: newStatus }: AudioPlayerState,
    ): void {
        if (oldStatus === newStatus) return;
        console.debug(`[${this._name}] (player) ${oldStatus} => ${newStatus}`);
    }

    public async cleanup(): Promise<void> {
        this._player.removeAllListeners();
        this._player.stop(true);

        this._connection.removeAllListeners();
        this._connection.destroy();
    }
}
