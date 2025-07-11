import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { VideoEditorService } from '../../services/video-editor.service';
import { VideoProject, PlaybackState, TimelineState } from '../../models/video-editor.models';

@Component({
  selector: 'app-video-preview',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  template: `
    <div class="preview-container">
      <div class="preview-header">
        <h3>Preview</h3>
        <div class="preview-controls">
          <button mat-icon-button (click)="toggleFullscreen()" matTooltip="Fullscreen">
            <mat-icon>fullscreen</mat-icon>
          </button>
          <button mat-icon-button (click)="resetView()" matTooltip="Reset View">
            <mat-icon>center_focus_strong</mat-icon>
          </button>
        </div>
      </div>

      <div class="preview-viewport" #viewport>
        <div class="video-container" [style.transform]="getViewportTransform()">
          <video 
            #videoPlayer
            class="preview-video"
            [src]="currentVideoSrc"
            [muted]="playbackState.muted"
            [volume]="playbackState.volume"
            (loadedmetadata)="onVideoLoaded($event)"
            (timeupdate)="onTimeUpdate($event)"
            (ended)="onVideoEnded()"
            (error)="onVideoError($event)"
            crossorigin="anonymous"
            preload="metadata"
          ></video>
          
          <div class="video-placeholder" *ngIf="!currentVideoSrc">
            <mat-icon class="placeholder-icon">movie</mat-icon>
            <h4>No Preview</h4>
            <p>Add clips to timeline to see preview</p>
          </div>
        </div>
        
        <!-- Overlay controls -->
        <div class="preview-overlay" *ngIf="currentVideoSrc">
          <div class="playback-controls">
            <button mat-fab color="primary" (click)="togglePlayback()" class="play-btn">
              <mat-icon>{{ playbackState.isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>
          </div>
          
          <div class="preview-info">
            <div class="timecode">
              {{ formatTime(playbackState.currentTime) }} / {{ formatTime(videoDuration) }}
            </div>
            <div class="resolution" *ngIf="videoWidth && videoHeight">
              {{ videoWidth }}x{{ videoHeight }}
            </div>
          </div>
        </div>
      </div>

      <div class="preview-footer">
        <div class="zoom-controls">
          <button mat-icon-button (click)="zoomOut()" matTooltip="Zoom Out">
            <mat-icon>zoom_out</mat-icon>
          </button>
          <span class="zoom-level">{{ (zoomLevel * 100) | number:'1.0-0' }}%</span>
          <button mat-icon-button (click)="zoomIn()" matTooltip="Zoom In">
            <mat-icon>zoom_in</mat-icon>
          </button>
          <button mat-icon-button (click)="fitToWindow()" matTooltip="Fit to Window">
            <mat-icon>fit_screen</mat-icon>
          </button>
        </div>
        
        <div class="playback-controls-footer">
          <button mat-icon-button (click)="previousFrame()" matTooltip="Previous Frame">
            <mat-icon>skip_previous</mat-icon>
          </button>
          <button mat-icon-button (click)="togglePlayback()" matTooltip="Play/Pause">
            <mat-icon>{{ playbackState.isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
          <button mat-icon-button (click)="nextFrame()" matTooltip="Next Frame">
            <mat-icon>skip_next</mat-icon>
          </button>
          <button mat-icon-button (click)="stop()" matTooltip="Stop">
            <mat-icon>stop</mat-icon>
          </button>
        </div>
        
        <div class="volume-controls">
          <button mat-icon-button (click)="toggleMute()" matTooltip="Mute">
            <mat-icon>{{ playbackState.muted ? 'volume_off' : 'volume_up' }}</mat-icon>
          </button>
          <mat-slider 
            class="volume-slider"
            [min]="0" 
            [max]="1" 
            [step]="0.1"
            [value]="playbackState.volume"
            (input)="onVolumeChange($event)"
            [disabled]="playbackState.muted">
          </mat-slider>
        </div>
        
        <div class="playback-speed">
          <mat-form-field appearance="outline" class="speed-select">
            <mat-select 
              [value]="playbackState.playbackRate" 
              (selectionChange)="onSpeedChange($event.value)">
              <mat-option value="0.25">0.25x</mat-option>
              <mat-option value="0.5">0.5x</mat-option>
              <mat-option value="1">1x</mat-option>
              <mat-option value="1.5">1.5x</mat-option>
              <mat-option value="2">2x</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./video-preview.component.scss']
})
export class VideoPreviewComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChild('viewport') viewport!: ElementRef<HTMLDivElement>;

  project: VideoProject | null = null;
  playbackState!: PlaybackState;
  timelineState!: TimelineState;

  currentVideoSrc = '';
  videoDuration = 0;
  videoWidth = 0;
  videoHeight = 0;
  zoomLevel = 1;
  panOffset = { x: 0, y: 0 };

  private destroy$ = new Subject<void>();
  private animationFrame: number | null = null;

  constructor(private videoEditorService: VideoEditorService) {}

  ngOnInit(): void {
    combineLatest([
      this.videoEditorService.getCurrentProject(),
      this.videoEditorService.getPlaybackState(),
      this.videoEditorService.getTimelineState()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([project, playbackState, timelineState]) => {
        this.project = project;
        this.playbackState = playbackState;
        this.timelineState = timelineState;
        
        this.updateVideoPlayback();
        this.updatePreviewFromTimeline();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private updateVideoPlayback(): void {
    if (!this.videoPlayer?.nativeElement) return;
    
    const video = this.videoPlayer.nativeElement;
    
    if (this.playbackState.isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!this.playbackState.isPlaying && !video.paused) {
      video.pause();
    }
    
    // Sync position if difference is significant
    if (Math.abs(video.currentTime - this.playbackState.currentTime) > 0.1) {
      video.currentTime = this.playbackState.currentTime;
    }
    
    video.playbackRate = this.playbackState.playbackRate;
    video.volume = this.playbackState.volume;
    video.muted = this.playbackState.muted;
  }

  private updatePreviewFromTimeline(): void {
    if (!this.project) return;
    
    // Find the clip at current position
    const currentClip = this.findClipAtPosition(this.playbackState.currentTime);
    
    if (currentClip && currentClip.resource !== this.currentVideoSrc) {
      this.currentVideoSrc = currentClip.resource;
      
      // Update video position relative to clip
      setTimeout(() => {
        if (this.videoPlayer?.nativeElement) {
          const clipTime = this.playbackState.currentTime - currentClip.startTime + currentClip.inPoint;
          this.videoPlayer.nativeElement.currentTime = clipTime;
        }
      }, 100);
    } else if (!currentClip) {
      this.currentVideoSrc = '';
    }
  }

  private findClipAtPosition(position: number): any {
    if (!this.project) return null;
    
    // Check video tracks first
    for (const track of this.project.tracks) {
      if (track.type === 'video') {
        for (const clip of track.clips) {
          if (position >= clip.startTime && position < clip.endTime) {
            return clip;
          }
        }
      }
    }
    return null;
  }

  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.videoDuration = video.duration;
    this.videoWidth = video.videoWidth;
    this.videoHeight = video.videoHeight;
    this.fitToWindow();
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    
    // Update timeline position
    if (this.playbackState.isPlaying) {
      this.videoEditorService.seek(video.currentTime);
    }
  }

  onVideoEnded(): void {
    if (this.playbackState.loop) {
      this.videoEditorService.seek(0);
    } else {
      this.videoEditorService.pause();
    }
  }

  onVideoError(event: Event): void {
    console.error('Video playback error:', event);
    this.currentVideoSrc = '';
  }

  // Playback Controls
  togglePlayback(): void {
    if (this.playbackState.isPlaying) {
      this.videoEditorService.pause();
    } else {
      this.videoEditorService.play();
    }
  }

  stop(): void {
    this.videoEditorService.stop();
  }

  previousFrame(): void {
    const frameTime = 1 / (this.project?.fps || 30);
    this.videoEditorService.seek(Math.max(0, this.playbackState.currentTime - frameTime));
  }

  nextFrame(): void {
    const frameTime = 1 / (this.project?.fps || 30);
    const maxTime = this.project?.duration || 0;
    this.videoEditorService.seek(Math.min(maxTime, this.playbackState.currentTime + frameTime));
  }

  onSpeedChange(speed: number): void {
    this.videoEditorService.setPlaybackRate(speed);
  }

  onVolumeChange(event: any): void {
    this.videoEditorService.setVolume(event.value);
  }

  toggleMute(): void {
    this.videoEditorService.toggleMute();
  }

  // Viewport Controls
  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.1);
  }

  fitToWindow(): void {
    if (!this.viewport?.nativeElement || !this.videoWidth || !this.videoHeight) return;
    
    const container = this.viewport.nativeElement;
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    const scaleX = containerWidth / this.videoWidth;
    const scaleY = containerHeight / this.videoHeight;
    
    this.zoomLevel = Math.min(scaleX, scaleY, 1);
    this.panOffset = { x: 0, y: 0 };
  }

  resetView(): void {
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };
  }

  toggleFullscreen(): void {
    if (!this.viewport?.nativeElement) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.viewport.nativeElement.requestFullscreen();
    }
  }

  getViewportTransform(): string {
    return `scale(${this.zoomLevel}) translate(${this.panOffset.x}px, ${this.panOffset.y}px)`;
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * (this.project?.fps || 30));
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }
}