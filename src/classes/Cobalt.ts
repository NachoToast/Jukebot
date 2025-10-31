import { Readable } from 'stream';
import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import { JukebotGlobals } from '../global';
import { FFmpegProcessor } from './FfmpegProcessor';
import { MusicDisc } from './MusicDisc';

/**
 * Response when cobalt is proxying the download for us.
 *
 * @see {@link https://github.com/imputnet/cobalt/blob/main/docs/api.md#tunnelredirect-response API Docs}
 */
interface CobaltTunnelOrRedirectResponse {
    status: 'tunnel' | 'redirect';

    /** URL for the cobalt tunnel, or redirect to an external link */
    url: string;

    /** cobalt-generated filename for the file being downloaded */
    filename: string;
}

/**
 * Response when cobalt is giving us multiple options to choose from.
 *
 * @see {@link https://github.com/imputnet/cobalt/blob/main/docs/api.md#picker-response API Docs}
 */
interface CobaltPickerResponse {
    status: 'picker';

    audio?: string;

    audoFilename?: string;

    picker?: CobaltPickerObject[];
}

/**
 * Response when something went wrong with cobalt.
 *
 * @see {@link https://github.com/imputnet/cobalt/blob/main/docs/api.md#error-response API Docs}
 */
interface CobaltErrorResponse {
    status: 'error';

    error: CobaltErrorObject;
}

/** @see {@link https://github.com/imputnet/cobalt/blob/main/docs/api.md#picker-object API Docs} */
interface CobaltPickerObject {
    type: 'photo' | 'video' | 'gif';

    url: string;

    /** Thumbnail URL. */
    thumb?: string;
}

/** @see {@link https://github.com/imputnet/cobalt/blob/main/docs/api.md#error-object API Docs} */
interface CobaltErrorObject {
    /** Machine-readable error code explaining the failure reason. */
    code: string;

    /** Container for providing more context. */
    context?: CobaltErrorContextObject;
}

/** @see {@link https://github.com/imputnet/cobalt/blob/main/docs/api.md#errorcontext-object API Docs} */
interface CobaltErrorContextObject {
    /** The service that was being downloaded from. */
    service?: string;

    /**
     * The configured maximum number of requests allowed (ratelimit), or
     * maximum video duration.
     */
    limit?: number;
}

type CobaltResponse = CobaltTunnelOrRedirectResponse | CobaltPickerResponse | CobaltErrorResponse;
interface ExtendedReadable extends Readable {
    readFromSource(): Promise<void>;
}

const IN_DOCKER = process.env.IN_DOCKER === 'true';

export class Cobalt {
    private readonly _disc: MusicDisc;

    public constructor(disc: MusicDisc) {
        this._disc = disc;
    }

    private log(message: string): void {
        this._disc._requestedIn
            .send({
                content: `Audio resource creation error:\n\`\`\`txt\nURL: ${this._disc._url}\n${message}\n\`\`\``,
                allowedMentions: { parse: [] },
            })
            .catch(() => null);
    }

    private static async getInitialResponse(url: string, signal: AbortSignal): Promise<CobaltTunnelOrRedirectResponse> {
        const res = await fetch(IN_DOCKER ? 'http://cobalt-api:9000/' : 'http://localhost:9000/', {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                url,
                downloadMode: 'audio',
                audioFormat: 'wav',
            }),
        });

        if (!res.ok) {
            throw new Error(`Failed to do initial fetch: ${res.status} ${res.statusText}`);
        }

        const parsed = (await res.json()) as CobaltResponse;

        if (parsed.status !== 'tunnel') {
            throw new Error(`Expected tunnel response, got ${parsed.status}:\n${JSON.stringify(parsed, undefined, 4)}`);
        }

        return parsed;
    }

    private static async createReadStream(
        initialResponse: CobaltTunnelOrRedirectResponse,
        signal: AbortSignal,
    ): Promise<Readable> {
        let inputStreamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        let isReading = false;
        let streamEnded = false;

        const outputStream = new Readable({
            read() {
                if (!isReading && inputStreamReader && !streamEnded) {
                    isReading = true;
                    (this as ExtendedReadable).readFromSource().catch((error: Error) => {
                        this.destroy(error);
                    });
                }
            },
            signal,
        }) as ExtendedReadable;

        outputStream.readFromSource = async function (this: ExtendedReadable): Promise<void> {
            try {
                while (inputStreamReader && !signal.aborted && !streamEnded) {
                    const { value, done } = await inputStreamReader.read();

                    if (done) {
                        streamEnded = true;
                        this.push(null);
                        return;
                    }

                    if (!this.push(value)) {
                        isReading = false;
                        return;
                    }
                }
            } catch (error) {
                streamEnded = true;
                this.destroy(error instanceof Error ? error : new Error(String(error)));
            }
        };

        try {
            const res = await fetch(
                IN_DOCKER ? initialResponse.url.replace('localhost', 'cobalt-api') : initialResponse.url,
                { signal },
            );

            if (!res.ok) {
                throw new Error(`Failed to fetch raw data: ${res.status} ${res.statusText}`);
            }

            if (res.body === null) {
                throw new Error('Response body is null');
            }

            inputStreamReader = res.body.getReader();

            // Handle abort signal
            const abortHandler = (): void => {
                streamEnded = true;
                if (inputStreamReader) {
                    inputStreamReader.cancel().catch(() => {});
                }
                outputStream.destroy();
            };

            if (signal.aborted) {
                abortHandler();
                return outputStream;
            }

            signal.addEventListener('abort', abortHandler);
        } catch (error) {
            streamEnded = true;
            if (inputStreamReader) {
                inputStreamReader.cancel().catch(() => {});
            }
            outputStream.destroy(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }

        return outputStream;
    }

    public async getResource(controller: AbortController): Promise<AudioResource<MusicDisc> | null> {
        try {
            const res = await Cobalt.getInitialResponse(this._disc._url, controller.signal);

            const stream = await Cobalt.createReadStream(res, controller.signal);

            const processedStream = FFmpegProcessor.process(
                stream,
                this._disc.playbackSpeed,
                this._disc.isPitchChangedOnPlaybackSpeed,
                this._disc.isReversed,
                this._disc.isEcho,
                controller,
            );

            const { stream: probedStream, type } = await demuxProbe(processedStream);

            const resource = createAudioResource<MusicDisc>(probedStream, {
                inputType: type,
                metadata: this._disc,
                inlineVolume: JukebotGlobals.config.volumeModifier !== 1,
            });

            if (JukebotGlobals.config.volumeModifier !== 1) {
                if (resource.volume === undefined) {
                    this._disc._requestedIn
                        .send({ content: `Unable to create volume transformer for ${this._disc._url}` })
                        .catch(() => null);
                } else {
                    resource.volume.setVolume(JukebotGlobals.config.volumeModifier);
                }
            }

            return resource;
        } catch (error) {
            if (error instanceof Error) {
                this.log(error.message);
            } else {
                this.log(`Unknown error: ${error}`);
            }

            return null;
        }
    }
}
