import { spawn } from 'child_process';
import { Readable } from 'stream';

export class FFmpegProcessor {
    public static process(
        input: Readable,
        speed: number = 1,
        isPitchChangedOnPlaybackSpeed: boolean = false,
        controller?: AbortController,
    ): Readable {
        console.log(`[FFmpeg] Starting processing with speed: ${speed}`);

        const playbackSpeed = isPitchChangedOnPlaybackSpeed
            ? `asetrate=${(44100 * speed).toFixed(2)}` // 44100 is the WAV khz
            : `atempo=${speed.toFixed(2)}`;

        const ffmpeg = spawn(
            'ffmpeg',
            [
                '-i',
                'pipe:0',
                '-filter:a',
                'areverse',
                playbackSpeed,
                '-f',
                'wav',
                '-acodec',
                'pcm_s16le',
                '-ar',
                '48000',
                '-ac',
                '2',
                '-avoid_negative_ts',
                'make_zero',
                '-fflags',
                '+genpts',
                '-thread_queue_size',
                '1024',
                '-loglevel',
                'error',
                'pipe:1',
            ],
            { stdio: ['pipe', 'pipe', 'pipe'] },
        );

        const cleanup = () => {
            if (!ffmpeg.killed) {
                ffmpeg.kill('SIGTERM');
                setTimeout(() => {
                    if (!ffmpeg.killed) {
                        console.log('[FFmpeg] Force killing process');
                        ffmpeg.kill('SIGKILL');
                    }
                }, 5000);
            }
        };

        if (controller) {
            const abortHandler = () => {
                console.log('[FFmpeg] Abort signal received');
                cleanup();
            };

            if (controller.signal.aborted) {
                cleanup();
                return ffmpeg.stdout!;
            }

            controller.signal.addEventListener('abort', abortHandler);
        }

        input.on('error', (error) => {
            console.error('[Input] Stream error:', error);
            cleanup();
        });

        input.on('end', () => {
            console.log('[Input] Stream ended');
            if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
                ffmpeg.stdin.end();
            }
        });

        if (ffmpeg.stdin) {
            ffmpeg.stdin.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EPIPE') {
                    console.log('[FFmpeg stdin] EPIPE (expected when ffmpeg closes early)');
                    return;
                }
                console.error('[FFmpeg stdin] Error:', error);
            });
        }

        if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
            input.pipe(ffmpeg.stdin, { end: true });
        }

        return ffmpeg.stdout!;
    }
}
