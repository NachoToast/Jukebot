import { spawn } from 'child_process';
import { Readable } from 'stream';

export class FFmpegProcessor {
  public static process(input: Readable, speed: number = 1): Readable {
    const atempo = `atempo=${speed.toFixed(2)}`;

    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-filter:a', atempo,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    input.pipe(ffmpeg.stdin!);

    return ffmpeg.stdout;
  }
}
