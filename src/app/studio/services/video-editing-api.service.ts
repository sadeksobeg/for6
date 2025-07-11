import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VideoMetadata {
  filename: string;
  duration_sec: number;
  width: number;
  height: number;
  fps: number;
  audio_channels: number;
  file_size?: number;
  codec?: string;
  bitrate?: number;
}

export interface Clip {
  id: string;
  filename: string;
  start: number;
  end: number;
  duration: number;
  in_point: number;
  out_point: number;
  color: string;
  metadata: VideoMetadata;
  thumbnail?: string;
}

export interface Track {
  id: string;
  type: 'video' | 'audio';
  name: string;
  color: string;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  height: number;
}

export interface Timeline {
  id: string;
  name: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  tracks: Track[];
  playhead_position: number;
  modified_at?: string;
}

export interface Project {
  id: string;
  name: string;
  timeline: Timeline;
  created_at: string;
  modified_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ExportSettings {
  preset: 'web' | 'high-quality' | 'mobile' | 'custom';
  format: 'mp4' | 'mov' | 'avi' | 'webm';
  resolution?: { width: number; height: number };
  fps?: number;
  bitrate?: number;
  quality?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoEditingApiService {
  private currentProject$ = new BehaviorSubject<Project | null>(null);
  private timeline$ = new BehaviorSubject<Timeline | null>(null);
  private playbackState$ = new BehaviorSubject<{
    playing: boolean;
    position: number;
    speed: number;
  }>({
    playing: false,
    position: 0,
    speed: 1
  });

  private pastelColors = [
    '#A3D9FF', '#FFB3BA', '#BAFFC9', '#FFFFBA', '#FFD1DC',
    '#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3',
    '#C7CEEA', '#B5EAD7', '#F0E68C', '#DDA0DD', '#98FB98'
  ];

  private logEntries: string[] = [];

  constructor() {
    this.initializeNewProject();
  }

  // Core API Methods

  /**
   * Import and inspect video file
   */
  async importVideo(filePath: string | File): Promise<ApiResponse<VideoMetadata>> {
    try {
      this.log(`Importing video: ${typeof filePath === 'string' ? filePath : filePath.name}`);
      
      let file: File;
      let filename: string;

      if (typeof filePath === 'string') {
        // Handle URL or file path
        const response = await fetch(filePath);
        const blob = await response.blob();
        filename = filePath.split('/').pop() || 'unknown.mp4';
        file = new File([blob], filename);
      } else {
        file = filePath;
        filename = file.name;
      }

      const metadata = await this.extractVideoMetadata(file);
      
      this.log(`Video imported successfully: ${filename} (${metadata.duration_sec}s, ${metadata.width}x${metadata.height})`);
      
      return {
        success: true,
        data: metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMsg = `Failed to import video: ${error}`;
      this.log(errorMsg);
      return {
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create new project with empty timeline
   */
  createProject(name: string = 'Untitled Project'): ApiResponse<Project> {
    try {
      const project: Project = {
        id: this.generateId(),
        name,
        timeline: {
          id: this.generateId(),
          name: 'Main Timeline',
          duration: 0,
          fps: 25,
          width: 1920,
          height: 1080,
          tracks: [],
          playhead_position: 0
        },
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString()
      };

      this.currentProject$.next(project);
      this.timeline$.next(project.timeline);
      
      this.log(`Created new project: ${name}`);
      
      return {
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create project: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Add video track to timeline
   */
  addVideoTrack(name?: string): ApiResponse<Timeline> {
    const timeline = this.timeline$.value;
    if (!timeline) {
      return {
        success: false,
        error: 'No active timeline',
        timestamp: new Date().toISOString()
      };
    }

    const trackNumber = timeline.tracks.filter(t => t.type === 'video').length + 1;
    const trackName = name || `V${trackNumber}`;

    const track: Track = {
      id: this.generateId(),
      type: 'video',
      name: trackName,
      color: this.getRandomPastelColor(),
      clips: [],
      muted: false,
      locked: false,
      height: 60
    };

    timeline.tracks.push(track);
    timeline.modified_at = new Date().toISOString();
    
    this.timeline$.next(timeline);
    this.updateProject();
    
    this.log(`Added video track: ${trackName}`);
    
    return {
      success: true,
      data: timeline,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add audio track to timeline
   */
  addAudioTrack(name?: string): ApiResponse<Timeline> {
    const timeline = this.timeline$.value;
    if (!timeline) {
      return {
        success: false,
        error: 'No active timeline',
        timestamp: new Date().toISOString()
      };
    }

    const trackNumber = timeline.tracks.filter(t => t.type === 'audio').length + 1;
    const trackName = name || `A${trackNumber}`;

    const track: Track = {
      id: this.generateId(),
      type: 'audio',
      name: trackName,
      color: this.getRandomPastelColor(),
      clips: [],
      muted: false,
      locked: false,
      height: 40
    };

    timeline.tracks.push(track);
    timeline.modified_at = new Date().toISOString();
    
    this.timeline$.next(timeline);
    this.updateProject();
    
    this.log(`Added audio track: ${trackName}`);
    
    return {
      success: true,
      data: timeline,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Add clip to track
   */
  async addClip(file: File | string, trackId: string, position?: number): Promise<ApiResponse<Timeline>> {
    try {
      const timeline = this.timeline$.value;
      if (!timeline) {
        return {
          success: false,
          error: 'No active timeline',
          timestamp: new Date().toISOString()
        };
      }

      const track = timeline.tracks.find(t => t.id === trackId);
      if (!track) {
        return {
          success: false,
          error: `Track not found: ${trackId}`,
          timestamp: new Date().toISOString()
        };
      }

      // Import video metadata
      const importResult = await this.importVideo(file);
      if (!importResult.success || !importResult.data) {
        return {
          success: false,
          error: importResult.error || 'Failed to import video',
          timestamp: new Date().toISOString()
        };
      }

      const metadata = importResult.data;
      
      // Calculate position (snap to end of timeline or specified position)
      const startPosition = position !== undefined ? position : this.calculateNextPosition(track);
      
      const clip: Clip = {
        id: this.generateId(),
        filename: metadata.filename,
        start: startPosition,
        end: startPosition + metadata.duration_sec,
        duration: metadata.duration_sec,
        in_point: 0,
        out_point: metadata.duration_sec,
        color: this.getRandomPastelColor(),
        metadata,
        thumbnail: await this.generateThumbnail(file)
      };

      track.clips.push(clip);
      track.clips.sort((a, b) => a.start - b.start);
      
      // Update timeline duration
      timeline.duration = Math.max(timeline.duration, clip.end);
      timeline.modified_at = new Date().toISOString();
      
      this.timeline$.next(timeline);
      this.updateProject();
      
      this.log(`Added clip to ${track.name}: ${metadata.filename} at ${startPosition}s`);
      
      return {
        success: true,
        data: timeline,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add clip: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Playback controls
   */
  play(position?: number): ApiResponse<void> {
    const currentState = this.playbackState$.value;
    const newState = {
      ...currentState,
      playing: true,
      position: position !== undefined ? position : currentState.position
    };
    
    this.playbackState$.next(newState);
    this.log(`Playback started at ${newState.position}s`);
    
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  pause(): ApiResponse<void> {
    const currentState = this.playbackState$.value;
    this.playbackState$.next({ ...currentState, playing: false });
    this.log('Playback paused');
    
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  scrub(position: number): ApiResponse<void> {
    const timeline = this.timeline$.value;
    if (timeline) {
      timeline.playhead_position = Math.max(0, Math.min(position, timeline.duration));
      this.timeline$.next(timeline);
    }
    
    const currentState = this.playbackState$.value;
    this.playbackState$.next({ ...currentState, position });
    this.log(`Scrubbed to ${position}s`);
    
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Split clip at timestamp
   */
  splitClip(clipId: string, atTime: number): ApiResponse<Timeline> {
    const timeline = this.timeline$.value;
    if (!timeline) {
      return {
        success: false,
        error: 'No active timeline',
        timestamp: new Date().toISOString()
      };
    }

    let targetTrack: Track | null = null;
    let clipIndex = -1;
    let clip: Clip | null = null;

    // Find the clip
    for (const track of timeline.tracks) {
      clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        targetTrack = track;
        clip = track.clips[clipIndex];
        break;
      }
    }

    if (!clip || !targetTrack) {
      return {
        success: false,
        error: `Clip not found: ${clipId}`,
        timestamp: new Date().toISOString()
      };
    }

    // Validate split position
    if (atTime <= clip.start || atTime >= clip.end) {
      return {
        success: false,
        error: 'Split time must be within clip bounds',
        timestamp: new Date().toISOString()
      };
    }

    // Create second part
    const secondClip: Clip = {
      ...clip,
      id: this.generateId(),
      start: atTime,
      in_point: clip.in_point + (atTime - clip.start),
      duration: clip.end - atTime
    };

    // Update first part
    clip.end = atTime;
    clip.out_point = clip.in_point + (atTime - clip.start);
    clip.duration = atTime - clip.start;

    // Insert second clip
    targetTrack.clips.splice(clipIndex + 1, 0, secondClip);
    
    timeline.modified_at = new Date().toISOString();
    this.timeline$.next(timeline);
    this.updateProject();
    
    this.log(`Split clip ${clipId} at ${atTime}s`);
    
    return {
      success: true,
      data: timeline,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Delete range from track
   */
  deleteRange(trackId: string, startTime: number, endTime: number): ApiResponse<Timeline> {
    const timeline = this.timeline$.value;
    if (!timeline) {
      return {
        success: false,
        error: 'No active timeline',
        timestamp: new Date().toISOString()
      };
    }

    const track = timeline.tracks.find(t => t.id === trackId);
    if (!track) {
      return {
        success: false,
        error: `Track not found: ${trackId}`,
        timestamp: new Date().toISOString()
      };
    }

    const rangeDuration = endTime - startTime;
    const clipsToRemove: string[] = [];
    const clipsToTrim: Clip[] = [];

    // Process clips
    track.clips.forEach(clip => {
      if (clip.end <= startTime || clip.start >= endTime) {
        // Clip is outside range - shift if after range
        if (clip.start >= endTime) {
          clip.start -= rangeDuration;
          clip.end -= rangeDuration;
        }
      } else if (clip.start >= startTime && clip.end <= endTime) {
        // Clip is completely within range - remove
        clipsToRemove.push(clip.id);
      } else {
        // Clip overlaps range - trim
        clipsToTrim.push(clip);
      }
    });

    // Remove clips
    track.clips = track.clips.filter(clip => !clipsToRemove.includes(clip.id));

    // Trim overlapping clips
    clipsToTrim.forEach(clip => {
      if (clip.start < startTime && clip.end > endTime) {
        // Clip spans entire range - split into two
        const secondClip: Clip = {
          ...clip,
          id: this.generateId(),
          start: startTime,
          end: clip.end - rangeDuration,
          in_point: clip.in_point + (endTime - clip.start),
          duration: clip.end - endTime
        };
        
        clip.end = startTime;
        clip.out_point = clip.in_point + (startTime - clip.start);
        clip.duration = startTime - clip.start;
        
        track.clips.push(secondClip);
      } else if (clip.start < startTime) {
        // Clip starts before range
        clip.end = startTime;
        clip.out_point = clip.in_point + (startTime - clip.start);
        clip.duration = startTime - clip.start;
      } else {
        // Clip ends after range
        const trimAmount = endTime - clip.start;
        clip.start = startTime;
        clip.end -= rangeDuration;
        clip.in_point += trimAmount;
        clip.duration -= trimAmount;
      }
    });

    // Sort clips
    track.clips.sort((a, b) => a.start - b.start);
    
    // Update timeline duration
    timeline.duration = Math.max(
      ...timeline.tracks.reduce((acc, t) => acc.concat(t.clips.map(c => c.end)), [] as number[]),
      0
    );
    timeline.modified_at = new Date().toISOString();
    
    this.timeline$.next(timeline);
    this.updateProject();
    
    this.log(`Deleted range ${startTime}s-${endTime}s from track ${track.name}`);
    
    return {
      success: true,
      data: timeline,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export timeline
   */
  async exportTimeline(settings: ExportSettings): Promise<ApiResponse<{ progress: number; output_path?: string }>> {
    try {
      this.log(`Starting export with preset: ${settings.preset}`);
      
      // Simulate export progress
      const progressUpdates = [10, 25, 50, 75, 90, 100];
      
      for (const progress of progressUpdates) {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.log(`Export progress: ${progress}%`);
        
        if (progress === 100) {
          const outputPath = `exports/output_${Date.now()}.${settings.format}`;
          this.log(`Export completed: ${outputPath}`);
          
          return {
            success: true,
            data: { progress: 100, output_path: outputPath },
            timestamp: new Date().toISOString()
          };
        }
      }
      
      return {
        success: false,
        error: 'Export failed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Observable getters
  get currentProject(): Observable<Project | null> {
    return this.currentProject$.asObservable();
  }

  get timeline(): Observable<Timeline | null> {
    return this.timeline$.asObservable();
  }

  get playbackState(): Observable<{ playing: boolean; position: number; speed: number }> {
    return this.playbackState$.asObservable();
  }

  get logs(): string[] {
    return [...this.logEntries];
  }

  // Private helper methods
  private initializeNewProject(): void {
    this.createProject('Untitled Project');
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRandomPastelColor(): string {
    return this.pastelColors[Math.floor(Math.random() * this.pastelColors.length)];
  }

  private calculateNextPosition(track: Track): number {
    if (track.clips.length === 0) return 0;
    return Math.max(...track.clips.map(c => c.end));
  }

  private updateProject(): void {
    const project = this.currentProject$.value;
    if (project) {
      project.modified_at = new Date().toISOString();
      this.currentProject$.next(project);
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logEntries.push(logEntry);
    console.log(logEntry);
  }

  private async extractVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          filename: file.name,
          duration_sec: video.duration,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          fps: 25, // Default, would need more complex detection
          audio_channels: 2, // Default
          file_size: file.size,
          codec: 'unknown'
        };
        
        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }

  private async generateThumbnail(file: File | string): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        canvas.width = 160;
        canvas.height = 90;
        
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          URL.revokeObjectURL(video.src);
          resolve(thumbnail);
        } catch (error) {
          URL.revokeObjectURL(video.src);
          reject(error);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to generate thumbnail'));
      };
      
      if (typeof file === 'string') {
        video.src = file;
      } else {
        video.src = URL.createObjectURL(file);
      }
    });
  }
}