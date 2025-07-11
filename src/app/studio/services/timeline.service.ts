import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Timeline, VideoClip, AudioClip, VideoTrack, AudioTrack, PlaybackState } from '../models/studio.models';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  private timelineSubject = new BehaviorSubject<Timeline>({
    fps: 25,
    width: 1920,
    height: 1080,
    duration: 0,
    position: 0,
    scale: 1,
    videoTracks: [],
    audioTracks: []
  });

  private playbackSubject = new BehaviorSubject<PlaybackState>({
    playing: false,
    position: 0,
    speed: 1,
    loop: false,
    volume: 1,
    muted: false
  });


  private selectedClipsSubject = new BehaviorSubject<(VideoClip | AudioClip)[]>([]);
  timeline$ = this.timelineSubject.asObservable();
  playback$ = this.playbackSubject.asObservable();
  selectedClips$ = this.selectedClipsSubject.asObservable();
  get selectedClipsValue() {
    return this.selectedClipsSubject.value;
  }

  constructor() {
    this.initializeDefaultTracks();
  }

  private initializeDefaultTracks(): void {
    const timeline = this.timelineSubject.value;
    
    // Create default video tracks (V1, V2, V3)
    for (let i = 0; i < 3; i++) {
      const track: VideoTrack = {
        id: `V${i + 1}`,
        name: `V${i + 1}`,
        locked: false,
        hidden: false,
        muted: false,
        clips: [],
        height: 50
      };
      timeline.videoTracks.push(track);
    }

    // Create default audio tracks (A1, A2)
    for (let i = 0; i < 2; i++) {
      const track: AudioTrack = {
        id: `A${i + 1}`,
        name: `A${i + 1}`,
        locked: false,
        hidden: false,
        muted: false,
        clips: [],
        height: 50
      };
      timeline.audioTracks.push(track);
    }

    this.timelineSubject.next(timeline);
  }

  addVideoTrack(): void {
    const timeline = this.timelineSubject.value;
    const trackNumber = timeline.videoTracks.length + 1;
    
    const track: VideoTrack = {
      id: `V${trackNumber}`,
      name: `V${trackNumber}`,
      locked: false,
      hidden: false,
      muted: false,
      clips: [],
      height: 50
    };
    
    timeline.videoTracks.push(track);
    this.timelineSubject.next(timeline);
  }

  addAudioTrack(): void {
    const timeline = this.timelineSubject.value;
    const trackNumber = timeline.audioTracks.length + 1;
    
    const track: AudioTrack = {
      id: `A${trackNumber}`,
      name: `A${trackNumber}`,
      locked: false,
      hidden: false,
      muted: false,
      clips: [],
      height: 50
    };
    
    timeline.audioTracks.push(track);
    this.timelineSubject.next(timeline);
  }

  addClipToTrack(clip: VideoClip | AudioClip, trackId: string): void {
    const timeline = this.timelineSubject.value;
    
    if ('thumbnail' in clip) {
      // Video clip
      const track = timeline.videoTracks.find(t => t.id === trackId);
      if (track && !track.locked) {
        track.clips.push(clip as VideoClip);
        this.updateTimelineDuration();
      }
    } else {
      // Audio clip
      const track = timeline.audioTracks.find(t => t.id === trackId);
      if (track && !track.locked) {
        track.clips.push(clip as AudioClip);
        this.updateTimelineDuration();
      }
    }
    
    this.timelineSubject.next(timeline);
  }

  removeClip(clipId: string): void {
    const timeline = this.timelineSubject.value;
    
    // Remove from video tracks
    timeline.videoTracks.forEach(track => {
      track.clips = track.clips.filter(clip => clip.id !== clipId);
    });
    
    // Remove from audio tracks
    timeline.audioTracks.forEach(track => {
      track.clips = track.clips.filter(clip => clip.id !== clipId);
    });
    
    this.updateTimelineDuration();
    this.timelineSubject.next(timeline);
  }

  selectClip(clipId: string, multiSelect: boolean = false): void {
    const timeline = this.timelineSubject.value;
    let selectedClips = this.selectedClipsSubject.value;
    
    // Find the clip
    let foundClip: VideoClip | AudioClip | null = null;
    
    for (const track of timeline.videoTracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        foundClip = clip;
        break;
      }
    }
    
    if (!foundClip) {
      for (const track of timeline.audioTracks) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) {
          foundClip = clip;
          break;
        }
      }
    }
    
    if (foundClip) {
      if (multiSelect) {
        const index = selectedClips.findIndex(c => c.id === clipId);
        if (index >= 0) {
          selectedClips.splice(index, 1);
        } else {
          selectedClips.push(foundClip);
        }
      } else {
        selectedClips = [foundClip];
      }
      
      // Update selection state
      this.updateClipSelection(selectedClips);
      this.selectedClipsSubject.next(selectedClips);
    }
  }

  private updateClipSelection(selectedClips: (VideoClip | AudioClip)[]): void {
    const timeline = this.timelineSubject.value;
    const selectedIds = selectedClips.map(c => c.id);
    
    // Update video clips
    timeline.videoTracks.forEach(track => {
      track.clips.forEach(clip => {
        clip.selected = selectedIds.includes(clip.id);
      });
    });
    
    // Update audio clips
    timeline.audioTracks.forEach(track => {
      track.clips.forEach(clip => {
        clip.selected = selectedIds.includes(clip.id);
      });
    });
    
    this.timelineSubject.next(timeline);
  }

  clearSelection(): void {
    this.selectedClipsSubject.next([]);
    this.updateClipSelection([]);
  }

  setPlaybackPosition(position: number): void {
    const playback = this.playbackSubject.value;
    playback.position = Math.max(0, position);
    this.playbackSubject.next(playback);
    
    const timeline = this.timelineSubject.value;
    timeline.position = playback.position;
    this.timelineSubject.next(timeline);
  }

  togglePlayback(): void {
    const playback = this.playbackSubject.value;
    playback.playing = !playback.playing;
    this.playbackSubject.next(playback);
  }

  setTimelineScale(scale: number): void {
    const timeline = this.timelineSubject.value;
    timeline.scale = Math.max(0.1, Math.min(10, scale));
    this.timelineSubject.next(timeline);
  }

  private updateTimelineDuration(): void {
    const timeline = this.timelineSubject.value;
    let maxDuration = 0;
    
    // Check video tracks
    timeline.videoTracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEnd = clip.start + clip.duration;
        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      });
    });
    
    // Check audio tracks
    timeline.audioTracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEnd = clip.start + clip.duration;
        if (clipEnd > maxDuration) {
          maxDuration = clipEnd;
        }
      });
    });
    
    timeline.duration = Math.max(maxDuration, 60); // Minimum 1 minute
  }

  moveClip(clipId: string, newStart: number, newTrackId?: string): void {
    const timeline = this.timelineSubject.value;
    
    // Find and remove clip from current track
    let clip: VideoClip | AudioClip | null = null;
    let currentTrack: VideoTrack | AudioTrack | null = null;
    
    for (const track of timeline.videoTracks) {
      const index = track.clips.findIndex(c => c.id === clipId);
      if (index >= 0) {
        clip = track.clips.splice(index, 1)[0];
        currentTrack = track;
        break;
      }
    }
    
    if (!clip) {
      for (const track of timeline.audioTracks) {
        const index = track.clips.findIndex(c => c.id === clipId);
        if (index >= 0) {
          clip = track.clips.splice(index, 1)[0];
          currentTrack = track;
          break;
        }
      }
    }
    
    if (clip) {
      clip.start = Math.max(0, newStart);
      // Add to new track or back to current track
      if (newTrackId && newTrackId !== currentTrack?.id) {
        const newTrack = [...timeline.videoTracks, ...timeline.audioTracks]
          .find(t => t.id === newTrackId);
        if (newTrack && !newTrack.locked) {
          if ('volume' in clip) {
            // AudioClip
            (newTrack.clips as AudioClip[]).push(clip as AudioClip);
          } else {
            // VideoClip
            (newTrack.clips as VideoClip[]).push(clip as VideoClip);
          }
        } else {
          // Fallback to original track
          if (currentTrack) {
            if ('volume' in clip) {
              (currentTrack.clips as AudioClip[]).push(clip as AudioClip);
            } else {
              (currentTrack.clips as VideoClip[]).push(clip as VideoClip);
            }
          }
        }
      } else {
        if (currentTrack) {
          if ('volume' in clip) {
            (currentTrack.clips as AudioClip[]).push(clip as AudioClip);
          } else {
            (currentTrack.clips as VideoClip[]).push(clip as VideoClip);
          }
        }
      }
      this.updateTimelineDuration();
      this.timelineSubject.next(timeline);
    }
  }

  splitClip(clipId: string, position: number): void {
    const timeline = this.timelineSubject.value;
    
    // Find the clip and track
    let track: VideoTrack | AudioTrack | null = null;
    let clipIndex = -1;
    let clip: VideoClip | AudioClip | null = null;
    
    for (const t of timeline.videoTracks) {
      clipIndex = t.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        track = t;
        clip = t.clips[clipIndex];
        break;
      }
    }
    
    if (!clip) {
      for (const t of timeline.audioTracks) {
        clipIndex = t.clips.findIndex(c => c.id === clipId);
        if (clipIndex >= 0) {
          track = t;
          clip = t.clips[clipIndex];
          break;
        }
      }
    }
    
    if (clip && track && position > clip.start && position < clip.start + clip.duration) {
      const splitPoint = position - clip.start;
      
      // Create second part
      const secondClip = { ...clip };
      secondClip.id = `${clip.id}_split_${Date.now()}`;
      secondClip.start = position;
      secondClip.in = clip.in + splitPoint;
      secondClip.duration = clip.duration - splitPoint;
      
      // Update first part
      clip.duration = splitPoint;
      clip.out = clip.in + splitPoint;
      
      // Insert second clip
      if ('volume' in secondClip) {
        (track.clips as AudioClip[]).splice(clipIndex + 1, 0, secondClip as AudioClip);
      } else {
        (track.clips as VideoClip[]).splice(clipIndex + 1, 0, secondClip as VideoClip);
      }
      
      this.timelineSubject.next(timeline);
    }
  }

  deleteSelectedClips(): void {
    const selectedClips = this.selectedClipsSubject.value;
    selectedClips.forEach(clip => this.removeClip(clip.id));
    this.clearSelection();
  }
}