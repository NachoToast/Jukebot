import { FullInteraction, GuildedInteraction } from '../types/Interactions';
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

/** Each Jukebox instance handles audio playback for a single guild. */
export class Jukebox {
    /** The interaction that created this instance. */
    private readonly _startingInteraction: FullInteraction;

    /** The latest interaction that caused this instance to join or move to a voice channel. */
    private _latestInteraction: FullInteraction;

    private _connection: VoiceConnection;
    private _player: AudioPlayer;

    public constructor(interaction: FullInteraction) {
        this._startingInteraction = interaction;
        this._latestInteraction = interaction;

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

    private get _name(): string {
        return this._startingInteraction.guild.name;
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

    // public async add(interaction: GuildedInteraction): Promise<void> {
    //     const connection = this._connection;

    //     const successfulAdd = await this._hopper.add(interaction);
    //     if (!successfulAdd) return;

    //     if (this._hopper.items.length === 1) {
    //         const nextItem = this._hopper.getNext();
    //         if (!nextItem) return;
    //         if (!interaction.member.voice.channelId) return;

    //         const localStream = await stream(nextItem.url, { quality: 2 });

    //         for (const event of localStream.stream.eventNames()) {
    //             if (typeof event !== 'string') continue;
    //             localStream.stream.on(event, () => console.log(event));
    //         }

    //         const resource = createAudioResource(localStream.stream, {
    //             inputType: localStream.type,
    //             inlineVolume: true,
    //         });

    //         const player = createAudioPlayer();
    //         player.play(resource);
    //         const sub = connection.subscribe(player);
    //         if (sub) {
    //             sub.connection.playOpusPacket;
    //         }
    //     }
    // }

    public async add(interaction: GuildedInteraction): Promise<void> {
        const queryString = interaction.options.get('song', true).value as string;

        console.log(queryString);

        await interaction.reply({ content: 'pog pog pogu', ephemeral: true });
    }

    public async cleanup(): Promise<void> {
        this._player.removeAllListeners();
        this._player.stop(true);

        this._connection.removeAllListeners();
        this._connection.destroy();
    }
}
