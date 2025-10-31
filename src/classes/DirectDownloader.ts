import { Readable } from 'stream';
import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import { stream as playStream } from 'play-dl';
import { JukebotGlobals } from '../global';
import { FFmpegProcessor } from './FfmpegProcessor';
import { MusicDisc } from './MusicDisc';

export class DirectDownloader {
    private readonly _disc: MusicDisc;

    public constructor(disc: MusicDisc) {
        this._disc = disc;
    }

    public async getResource(controller: AbortController): Promise<AudioResource<MusicDisc> | null> {
        try {
            // Use play-dl to get the best audio stream directly from the source.
            // Use a typed alias for the awaited return so we can narrow safely.
            type PlayDLStreamInfo = Awaited<ReturnType<typeof playStream>>;

            const streamInfo = (await playStream(this._disc._url, { quality: 2 })) as unknown as PlayDLStreamInfo;

            // play-dl may return either a Readable directly or an object with a
            // `.stream` property containing the Readable. Narrow both cases.
            let inputStream: Readable | null = null;

            if ((streamInfo as unknown as Readable).readable !== undefined) {
                inputStream = streamInfo as unknown as Readable;
            } else if (typeof streamInfo === 'object' && streamInfo !== null && 'stream' in streamInfo) {
                inputStream = (streamInfo as { stream?: Readable }).stream ?? null;
            }

            if (!inputStream) {
                this._disc._requestedIn
                    .send({ content: `Direct download failed: no stream for ${this._disc._url}` })
                    .catch(() => null);
                return null;
            }

            // Ensure the stream is aborted if the controller signals
            if (controller) {
                const abortHandler = () => {
                    try {
                        inputStream.destroy(new Error('Aborted'));
                    } catch (e) {
                        /* ignore */
                    }
                };

                if (controller.signal.aborted) abortHandler();
                controller.signal.addEventListener('abort', abortHandler);
            }

            const processed = FFmpegProcessor.process(
                inputStream,
                this._disc.playbackSpeed,
                this._disc.isPitchChangedOnPlaybackSpeed,
                this._disc.isReversed,
                this._disc.isEcho,
                controller,
            );

            const { stream: probedStream, type } = await demuxProbe(processed);

            const resource = createAudioResource<MusicDisc>(probedStream, {
                inputType: type,
                metadata: this._disc,
                inlineVolume: JukebotGlobals.config.volumeModifier !== 1,
            });

            if (JukebotGlobals.config.volumeModifier !== 1 && resource.volume !== undefined) {
                resource.volume.setVolume(JukebotGlobals.config.volumeModifier);
            }

            return resource;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this._disc._requestedIn.send({ content: `DirectDownloader error:\n\`${msg}\`` }).catch(() => null);
            return null;
        }
    }
}
