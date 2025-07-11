import { Injectable } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { BehaviorSubject, Observable } from 'rxjs';
import { ExportSettings, RenderProgress } from '../models/video-editor.models';

@Injectable({
  providedIn: 'root'
})
export class FFmpegService {
  private ffmpeg: FFmpeg;
  private isLoaded = false;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private progressSubject = new BehaviorSubject<RenderProgress>({ progress: 0, stage: 'idle' });

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  get loading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  get progress$(): Observable<RenderProgress> {
    return this.progressSubject.asObservable();
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;

    this.loadingSubject.next(true);
    
    try {
      const baseURL = 'assets/ffmpeg-core';
      
      // Load FFmpeg with progress tracking
      this.ffmpeg.on('progress', ({ progress, time }) => {
        this.progressSubject.next({
          progress: progress * 100,
          stage: 'processing',
          timeRemaining: time
        });
      });

      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
      });

      this.isLoaded = true;
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async extractVideoMetadata(file: File): Promise<any> {
    await this.ensureLoaded();
    
    const fileName = `input.${file.name.split('.').pop()}`;
    await this.ffmpeg.writeFile(fileName, await fetchFile(file));
    
    // Extract metadata using ffprobe-like functionality
    await this.ffmpeg.exec([
      '-i', fileName,
      '-f', 'null',
      '-'
    ]);
    
    // Clean up
    await this.ffmpeg.deleteFile(fileName);
    
    // Return basic metadata (in real implementation, parse ffmpeg output)
    return {
      duration: 0, // Parse from ffmpeg output
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264'
    };
  }

  async generateThumbnail(file: File, timeOffset: number = 1): Promise<string> {
    await this.ensureLoaded();
    
    const inputName = `input.${file.name.split('.').pop()}`;
    const outputName = 'thumbnail.jpg';
    
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));
    
    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', timeOffset.toString(),
      '-vframes', '1',
      '-vf', 'scale=160:90',
      '-q:v', '2',
      outputName
    ]);
    
    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    
    // Clean up
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);
    
    return url;
  }

  async trimVideo(file: File, startTime: number, duration: number): Promise<Blob> {
    await this.ensureLoaded();
    
    const inputName = `input.${file.name.split('.').pop()}`;
    const outputName = 'output.mp4';
    
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));
    
    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c', 'copy',
      outputName
    ]);
    
    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    
    // Clean up
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);
    
    return blob;
  }

  async concatenateVideos(files: File[]): Promise<Blob> {
    await this.ensureLoaded();
    
    // Write all input files
    const inputList: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const fileName = `input${i}.${files[i].name.split('.').pop()}`;
      await this.ffmpeg.writeFile(fileName, await fetchFile(files[i]));
      inputList.push(`file '${fileName}'`);
    }
    
    // Create concat list file
    const listContent = inputList.join('\n');
    await this.ffmpeg.writeFile('list.txt', new TextEncoder().encode(listContent));
    
    const outputName = 'output.mp4';
    
    await this.ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'list.txt',
      '-c', 'copy',
      outputName
    ]);
    
    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    
    // Clean up
    for (let i = 0; i < files.length; i++) {
      await this.ffmpeg.deleteFile(`input${i}.${files[i].name.split('.').pop()}`);
    }
    await this.ffmpeg.deleteFile('list.txt');
    await this.ffmpeg.deleteFile(outputName);
    
    return blob;
  }

  async exportVideo(
    clips: { file: File; startTime: number; duration: number; trackOffset: number }[],
    settings: ExportSettings
  ): Promise<Blob> {
    await this.ensureLoaded();
    
    this.progressSubject.next({ progress: 0, stage: 'preparing' });
    
    // Complex filter for multiple clips
    const filterComplex: string[] = [];
    const inputs: string[] = [];
    
    // Write input files and build filter
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const fileName = `input${i}.${clip.file.name.split('.').pop()}`;
      await this.ffmpeg.writeFile(fileName, await fetchFile(clip.file));
      inputs.push('-i', fileName);
      
      // Add trim and setpts filters
      filterComplex.push(
        `[${i}:v]trim=start=${clip.startTime}:duration=${clip.duration},setpts=PTS-STARTPTS[v${i}]`
      );
      filterComplex.push(
        `[${i}:a]atrim=start=${clip.startTime}:duration=${clip.duration},asetpts=PTS-STARTPTS[a${i}]`
      );
    }
    
    // Concatenate all clips
    const videoInputs = clips.map((_, i) => `[v${i}]`).join('');
    const audioInputs = clips.map((_, i) => `[a${i}]`).join('');
    filterComplex.push(`${videoInputs}concat=n=${clips.length}:v=1:a=0[outv]`);
    filterComplex.push(`${audioInputs}concat=n=${clips.length}:v=0:a=1[outa]`);
    
    const outputName = `output.${settings.format}`;
    
    const command = [
      ...inputs,
      '-filter_complex', filterComplex.join(';'),
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', settings.videoCodec || 'libx264',
      '-c:a', settings.audioCodec || 'aac',
      '-b:v', `${settings.bitrate}k`,
      '-r', settings.fps.toString(),
      '-s', `${settings.resolution.width}x${settings.resolution.height}`,
      '-preset', 'fast',
      '-y',
      outputName
    ];
    
    this.progressSubject.next({ progress: 10, stage: 'encoding' });
    
    await this.ffmpeg.exec(command);
    
    const data = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: `video/${settings.format}` });
    
    // Clean up
    for (let i = 0; i < clips.length; i++) {
      await this.ffmpeg.deleteFile(`input${i}.${clips[i].file.name.split('.').pop()}`);
    }
    await this.ffmpeg.deleteFile(outputName);
    
    this.progressSubject.next({ progress: 100, stage: 'complete' });
    
    return blob;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.load();
    }
  }
}