import { Readable } from 'stream';
import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import YTDlpWrap from 'yt-dlp-wrap';
import { JukebotGlobals } from '../global';
import { FFmpegProcessor } from './FfmpegProcessor';
import { MusicDisc } from './MusicDisc';

/**
 * Handles audio resource creation from YouTube URLs using yt-dlp.
 * This class name is kept for backward compatibility, but it no longer uses Cobalt API.
 */
export class Cobalt {
    private readonly _disc: MusicDisc;
    private static _ytDlpWrap: YTDlpWrap | null = null;

    public constructor(disc: MusicDisc) {
        this._disc = disc;
    }

    private static getYtDlpWrap(): YTDlpWrap {
        if (!Cobalt._ytDlpWrap) {
            Cobalt._ytDlpWrap = new YTDlpWrap();
        }
        return Cobalt._ytDlpWrap;
    }

    private log(message: string): void {
        this._disc._requestedIn
            .send({
                content: `Audio resource creation error:\n\`\`\`txt\nURL: ${this._disc._url}\n${message}\n\`\`\``,
                allowedMentions: { parse: [] },
            })
            .catch(() => null);
    }

    public async getResource(controller: AbortController): Promise<AudioResource<MusicDisc> | null> {
        try {
            // Use yt-dlp for reliable YouTube streaming
            let audioStream: Readable;
            
            try {
                const ytDlpWrap = Cobalt.getYtDlpWrap();
                
                // Get stream URL using yt-dlp (most reliable method)
                const streamUrl = await ytDlpWrap.execPromise([
                    this._disc._url,
                    '--format', 'bestaudio/best',
                    '--get-url',
                    '--no-playlist',
                ]);
                
                if (!streamUrl || streamUrl.trim() === '') {
                    throw new Error('Failed to get stream URL from yt-dlp');
                }
                
                const url = streamUrl.trim();
                
                // Fetch the stream using Node.js fetch
                const response = await fetch(url, {
                    signal: controller.signal,
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch audio stream: ${response.status} ${response.statusText}`);
                }
                
                if (!response.body) {
                    throw new Error('Response body is null');
                }
                
                // Convert ReadableStream to Node.js Readable
                const reader = response.body.getReader();
                let isReading = false;
                let streamEnded = false;
                
                audioStream = new Readable({
                    read() {
                        if (isReading || streamEnded) return;
                        isReading = true;
                        
                        reader.read().then(({ done, value }) => {
                            isReading = false;
                            if (done) {
                                streamEnded = true;
                                this.push(null);
                            } else {
                                this.push(Buffer.from(value));
                            }
                        }).catch((error) => {
                            streamEnded = true;
                            this.destroy(error instanceof Error ? error : new Error(String(error)));
                        });
                    },
                });
                
                // Handle abort signal
                controller.signal.addEventListener('abort', () => {
                    if (!streamEnded) {
                        reader.cancel();
                        audioStream.destroy();
                    }
                });
                
            } catch (error) {
                // Log the full error for debugging
                console.error('[Cobalt] Error getting stream:', error);
                
                if (error instanceof Error) {
                    // Handle common errors
                    if (error.message.includes('Sign in to confirm your age') || error.message.includes('age-restricted')) {
                        throw new Error('This video is age-restricted. YouTube age restricted content integration may need to be configured.');
                    }
                    if (error.message.includes('Private video') || error.message.includes('private')) {
                        throw new Error('Cannot access private video');
                    }
                    if (error.message.includes('unavailable') || error.message.includes('not available') || error.message.includes('Video unavailable')) {
                        throw new Error('Video is unavailable');
                    }
                    if (error.message.includes('Invalid URL') || error.message.includes('No video id found')) {
                        throw new Error(`Invalid YouTube URL: ${this._disc._url}`);
                    }
                    if (error.message.includes('spawn yt-dlp ENOENT') || error.message.includes('yt-dlp')) {
                        throw new Error('yt-dlp is not installed or not found in PATH. Please install yt-dlp from https://github.com/yt-dlp/yt-dlp/releases');
                    }
                    if (error.message.includes('403') || error.message.includes('Status code: 403')) {
                        throw new Error('YouTube returned 403 Forbidden. This may be due to YouTube blocking requests. Try again later.');
                    }
                    throw new Error(`Failed to stream video: ${error.message}`);
                }
                throw new Error(`Unknown error while streaming: ${String(error)}`);
            }

            // Handle stream errors
            audioStream.on('error', (error: Error) => {
                console.error('[Cobalt] Stream error:', error);
                if (error.message.includes('private')) {
                    this.log('Cannot access private video');
                } else if (error.message.includes('unavailable') || error.message.includes('not available')) {
                    this.log('Video is unavailable');
                } else {
                    this.log(`Stream error: ${error.message}`);
                }
            });

            // Handle abort signal by destroying the stream
            if (controller.signal.aborted) {
                if (audioStream && !audioStream.destroyed) {
                    audioStream.destroy();
                }
                throw new Error('Stream request was aborted');
            }

            const abortHandler = (): void => {
                if (audioStream && !audioStream.destroyed) {
                    audioStream.destroy();
                }
            };

            controller.signal.addEventListener('abort', abortHandler);

            // Process the stream through FFmpeg for playback speed, reversal, echo, etc.
            const processedStream = FFmpegProcessor.process(
                audioStream,
                this._disc.playbackSpeed,
                this._disc.isPitchChangedOnPlaybackSpeed,
                this._disc.isReversed,
                this._disc.isEcho,
                controller,
            );

            // Probe and create the audio resource
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
            // Enhanced error logging
            console.error('[Cobalt] getResource error:', error);
            if (error instanceof Error) {
                // Log stack trace for debugging
                console.error('[Cobalt] Error stack:', error.stack);
                this.log(error.message);
            } else {
                const errorStr = String(error);
                console.error('[Cobalt] Non-Error object:', errorStr);
                this.log(`Unknown error: ${errorStr}`);
            }

            return null;
        }
    }
}
