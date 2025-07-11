import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  VideoProject, 
  Track, 
  Clip, 
  MediaAsset, 
  PlaybackState, 
  TimelineState,
  TrackType,
  MediaType,
  Resolution
} from '../models/video-editor.models';

@Injectable({
  providedIn: 'root'
})
export class VideoEditorService {
  private currentProject$ = new BehaviorSubject<VideoProject | null>(null);
  private playbackState$ = new BehaviorSubject<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1,
    volume: 1,
    muted: false,
    loop: false
  });
  private timelineState$ = new BehaviorSubject<TimelineState>({
    zoom: 1,
    scrollPosition: 0,
    snapToGrid: true,
    gridSize: 1,
    selectedClips: [],
    playheadPosition: 0
  });
  private mediaAssets$ = new BehaviorSubject<MediaAsset[]>([]);
  
  private projectUpdated$ = new Subject<void>();

  constructor() {
    this.initializeDefaultProject();
  }

  // Project Management
  getCurrentProject(): Observable<VideoProject | null> {
    return this.currentProject$.asObservable();
  }

  createNewProject(name: string, resolution: Resolution = { width: 1920, height: 1080 }): VideoProject {
    const project: VideoProject = {
      id: uuidv4(),
      name,
      description: '',
      duration: 0,
      fps: 30,
      resolution,
      tracks: this.createDefaultTracks(),
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    this.currentProject$.next(project);
    this.notifyProjectUpdate();
    return project;
  }

  updateProject(updates: Partial<VideoProject>): void {
    const currentProject = this.currentProject$.value;
    if (currentProject) {
      const updatedProject = {
        ...currentProject,
        ...updates,
        modifiedAt: new Date()
      };
      this.currentProject$.next(updatedProject);
      this.notifyProjectUpdate();
    }
  }

  // Track Management
  addTrack(type: TrackType, name?: string): Track {
    const currentProject = this.currentProject$.value;
    if (!currentProject) throw new Error('No active project');

    const trackNumber = currentProject.tracks.filter(t => t.type === type).length + 1;
    const track: Track = {
      id: uuidv4(),
      name: name || `${type.toUpperCase()} ${trackNumber}`,
      type,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      height: type === TrackType.VIDEO ? 80 : 60,
      color: this.generateTrackColor(type)
    };

    currentProject.tracks.push(track);
    this.updateProject({ tracks: currentProject.tracks });
    return track;
  }

  removeTrack(trackId: string): void {
    const currentProject = this.currentProject$.value;
    if (!currentProject) return;

    currentProject.tracks = currentProject.tracks.filter(t => t.id !== trackId);
    this.updateProject({ tracks: currentProject.tracks });
  }

  updateTrack(trackId: string, updates: Partial<Track>): void {
    const currentProject = this.currentProject$.value;
    if (!currentProject) return;

    const trackIndex = currentProject.tracks.findIndex(t => t.id === trackId);
    if (trackIndex >= 0) {
      currentProject.tracks[trackIndex] = {
        ...currentProject.tracks[trackIndex],
        ...updates
      };
      this.updateProject({ tracks: currentProject.tracks });
    }
  }

  // Clip Management
  addClip(trackId: string, mediaAsset: MediaAsset, startTime: number): Clip {
    const currentProject = this.currentProject$.value;
    if (!currentProject) throw new Error('No active project');

    const track = currentProject.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');

    const clip: Clip = {
      id: uuidv4(),
      name: mediaAsset.name,
      trackId,
      mediaId: mediaAsset.id,
      startTime,
      endTime: startTime + mediaAsset.duration,
      duration: mediaAsset.duration,
      inPoint: 0,
      outPoint: mediaAsset.duration,
      position: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1
      },
      effects: [],
      transitions: [],
      selected: false,
      locked: false,
      color: this.generateClipColor()
    };

    track.clips.push(clip);
    this.updateProjectDuration();
    this.updateProject({ tracks: currentProject.tracks });
    return clip;
  }

  removeClip(clipId: string): void {
    const currentProject = this.currentProject$.value;
    if (!currentProject) return;

    currentProject.tracks.forEach(track => {
      track.clips = track.clips.filter(c => c.id !== clipId);
    });

    this.updateProjectDuration();
    this.updateProject({ tracks: currentProject.tracks });
  }

  updateClip(clipId: string, updates: Partial<Clip>): void {
    const currentProject = this.currentProject$.value;
    if (!currentProject) return;

    for (const track of currentProject.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        track.clips[clipIndex] = {
          ...track.clips[clipIndex],
          ...updates
        };
        
        // Update duration if start/end times changed
        if (updates.startTime !== undefined || updates.endTime !== undefined) {
          const clip = track.clips[clipIndex];
          clip.duration = clip.endTime - clip.startTime;
        }
        
        this.updateProjectDuration();
        this.updateProject({ tracks: currentProject.tracks });
        break;
      }
    }
  }

  moveClip(clipId: string, newTrackId: string, newStartTime: number): void {
    const currentProject = this.currentProject$.value;
    if (!currentProject) return;

    // Find and remove clip from current track
    let clip: Clip | null = null;
    for (const track of currentProject.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        clip = track.clips.splice(clipIndex, 1)[0];
        break;
      }
    }

    if (!clip) return;

    // Add to new track
    const newTrack = currentProject.tracks.find(t => t.id === newTrackId);
    if (newTrack) {
      const duration = clip.duration;
      clip.trackId = newTrackId;
      clip.startTime = newStartTime;
      clip.endTime = newStartTime + duration;
      newTrack.clips.push(clip);
      
      this.updateProjectDuration();
      this.updateProject({ tracks: currentProject.tracks });
    }
  }

  splitClip(clipId: string, splitTime: number): void {
    const currentProject = this.currentProject$.value;
    if (!currentProject) return;

    for (const track of currentProject.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        const originalClip = track.clips[clipIndex];
        
        if (splitTime <= originalClip.startTime || splitTime >= originalClip.endTime) {
          return; // Invalid split time
        }

        // Create second part
        const secondClip: Clip = {
          ...originalClip,
          id: uuidv4(),
          startTime: splitTime,
          inPoint: originalClip.inPoint + (splitTime - originalClip.startTime),
          duration: originalClip.endTime - splitTime
        };

        // Update first part
        originalClip.endTime = splitTime;
        originalClip.outPoint = originalClip.inPoint + (splitTime - originalClip.startTime);
        originalClip.duration = splitTime - originalClip.startTime;

        // Insert second clip
        track.clips.splice(clipIndex + 1, 0, secondClip);
        
        this.updateProject({ tracks: currentProject.tracks });
        break;
      }
    }
  }

  // Selection Management
  selectClip(clipId: string, multiSelect: boolean = false): void {
    const timelineState = this.timelineState$.value;
    
    if (multiSelect) {
      const selectedClips = [...timelineState.selectedClips];
      const index = selectedClips.indexOf(clipId);
      
      if (index >= 0) {
        selectedClips.splice(index, 1);
      } else {
        selectedClips.push(clipId);
      }
      
      this.updateTimelineState({ selectedClips });
    } else {
      this.updateTimelineState({ selectedClips: [clipId] });
    }
  }

  clearSelection(): void {
    this.updateTimelineState({ selectedClips: [] });
  }

  // Media Asset Management
  getMediaAssets(): Observable<MediaAsset[]> {
    return this.mediaAssets$.asObservable();
  }

  addMediaAsset(file: File): Promise<MediaAsset> {
    return new Promise((resolve, reject) => {
      const asset: MediaAsset = {
        id: uuidv4(),
        name: file.name,
        type: this.getMediaTypeFromFile(file),
        url: URL.createObjectURL(file),
        duration: 0,
        fileSize: file.size,
        format: file.type,
        metadata: {}
      };

      if (asset.type === MediaType.VIDEO || asset.type === MediaType.AUDIO) {
        this.extractMediaMetadata(file, asset).then(() => {
          const currentAssets = this.mediaAssets$.value;
          this.mediaAssets$.next([...currentAssets, asset]);
          resolve(asset);
        }).catch(reject);
      } else {
        // For images, set default duration
        asset.duration = 5; // 5 seconds default for images
        const currentAssets = this.mediaAssets$.value;
        this.mediaAssets$.next([...currentAssets, asset]);
        resolve(asset);
      }
    });
  }

  removeMediaAsset(assetId: string): void {
    const currentAssets = this.mediaAssets$.value;
    const updatedAssets = currentAssets.filter(a => a.id !== assetId);
    this.mediaAssets$.next(updatedAssets);
  }

  // Playback Control
  getPlaybackState(): Observable<PlaybackState> {
    return this.playbackState$.asObservable();
  }

  play(): void {
    this.updatePlaybackState({ isPlaying: true });
  }

  pause(): void {
    this.updatePlaybackState({ isPlaying: false });
  }

  stop(): void {
    this.updatePlaybackState({ 
      isPlaying: false, 
      currentTime: 0 
    });
    this.updateTimelineState({ playheadPosition: 0 });
  }

  seek(time: number): void {
    this.updatePlaybackState({ currentTime: time });
    this.updateTimelineState({ playheadPosition: time });
  }

  setPlaybackRate(rate: number): void {
    this.updatePlaybackState({ playbackRate: rate });
  }

  setVolume(volume: number): void {
    this.updatePlaybackState({ volume: Math.max(0, Math.min(1, volume)) });
  }

  toggleMute(): void {
    const currentState = this.playbackState$.value;
    this.updatePlaybackState({ muted: !currentState.muted });
  }

  // Timeline State
  getTimelineState(): Observable<TimelineState> {
    return this.timelineState$.asObservable();
  }

  setZoom(zoom: number): void {
    this.updateTimelineState({ zoom: Math.max(0.1, Math.min(10, zoom)) });
  }

  setScrollPosition(position: number): void {
    this.updateTimelineState({ scrollPosition: Math.max(0, position) });
  }

  toggleSnapToGrid(): void {
    const currentState = this.timelineState$.value;
    this.updateTimelineState({ snapToGrid: !currentState.snapToGrid });
  }

  // Project Updates Observable
  getProjectUpdates(): Observable<void> {
    return this.projectUpdated$.asObservable();
  }

  // Private Methods
  private initializeDefaultProject(): void {
    this.createNewProject('Untitled Project');
  }

  private createDefaultTracks(): Track[] {
    return [
      {
        id: uuidv4(),
        name: 'Video 1',
        type: TrackType.VIDEO,
        clips: [],
        muted: false,
        locked: false,
        visible: true,
        height: 80,
        color: '#2196F3'
      },
      {
        id: uuidv4(),
        name: 'Audio 1',
        type: TrackType.AUDIO,
        clips: [],
        muted: false,
        locked: false,
        visible: true,
        height: 60,
        color: '#4CAF50'
      }
    ];
  }

  private generateTrackColor(type: TrackType): string {
    const colors = {
      [TrackType.VIDEO]: '#2196F3',
      [TrackType.AUDIO]: '#4CAF50',
      [TrackType.SUBTITLE]: '#FF9800',
      [TrackType.EFFECT]: '#9C27B0'
    };
    return colors[type];
  }

  private generateClipColor(): string {
    const colors = ['#E3F2FD', '#E8F5E8', '#FFF3E0', '#F3E5F5', '#FFEBEE'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getMediaTypeFromFile(file: File): MediaType {
    if (file.type.startsWith('video/')) return MediaType.VIDEO;
    if (file.type.startsWith('audio/')) return MediaType.AUDIO;
    if (file.type.startsWith('image/')) return MediaType.IMAGE;
    return MediaType.VIDEO; // Default
  }

  private extractMediaMetadata(file: File, asset: MediaAsset): Promise<void> {
    return new Promise((resolve, reject) => {
      if (asset.type === MediaType.VIDEO) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          asset.duration = video.duration;
          asset.resolution = {
            width: video.videoWidth,
            height: video.videoHeight
          };
          asset.metadata = {
            frameRate: 30, // Default, would need more complex detection
            codec: 'unknown'
          };
          
          // Generate thumbnail
          this.generateThumbnail(video).then(thumbnail => {
            asset.thumbnail = thumbnail;
            resolve();
          }).catch(() => resolve()); // Continue without thumbnail
        };
        
        video.onerror = () => reject(new Error('Failed to load video metadata'));
        video.src = asset.url;
      } else if (asset.type === MediaType.AUDIO) {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        
        audio.onloadedmetadata = () => {
          asset.duration = audio.duration;
          asset.metadata = {
            channels: 2, // Default
            sampleRate: 44100 // Default
          };
          resolve();
        };
        
        audio.onerror = () => reject(new Error('Failed to load audio metadata'));
        audio.src = asset.url;
      } else {
        resolve();
      }
    });
  }

  private generateThumbnail(video: HTMLVideoElement): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = 160;
      canvas.height = 90;
      
      video.currentTime = Math.min(1, video.duration * 0.1);
      
      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  private updatePlaybackState(updates: Partial<PlaybackState>): void {
    const currentState = this.playbackState$.value;
    this.playbackState$.next({ ...currentState, ...updates });
  }

  private updateTimelineState(updates: Partial<TimelineState>): void {
    const currentState = this.timelineState$.value;
    this.timelineState$.next({ ...currentState, ...updates });
  }

  private updateProjectDuration(): void {
    const currentProject = this.currentProject$.value;
    if (!currentProject) return;

    let maxDuration = 0;
    currentProject.tracks.forEach(track => {
      track.clips.forEach(clip => {
        maxDuration = Math.max(maxDuration, clip.endTime);
      });
    });

    if (maxDuration !== currentProject.duration) {
      this.updateProject({ duration: maxDuration });
    }
  }

  private notifyProjectUpdate(): void {
    this.projectUpdated$.next();
  }
}