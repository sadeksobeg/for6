import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TimelineService } from '../../services/timeline.service';
import { PlaybackState } from '../../models/studio.models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="preview-container">
      <div class="preview-header">
        <h3>Preview</h3>
        <div class="preview-controls">
          <button class="btn btn-sm" (click)="toggleFullscreen()">
            <i class="icon-fullscreen"></i>
          </button>
          <button class="btn btn-sm" (click)="resetView()">
            <i class="icon-reset"></i>
          </button>
        </div>
      </div>

      <div class="preview-viewport" #viewport>
        <div class="video-container" [style.transform]="getViewportTransform()">
          <video 
            #videoPlayer
            class="preview-video"
            [src]="currentVideoSrc"
            [muted]="playback.muted"
            [volume]="playback.volume"
            (loadedmetadata)="onVideoLoaded($event)"
            (timeupdate)="onTimeUpdate($event)"
            (ended)="onVideoEnded()"
            (error)="onVideoError($event)"
            crossorigin="anonymous"
            preload="metadata"
          ></video>
          
          <div class="video-placeholder" *ngIf="!currentVideoSrc">
            <div class="placeholder-icon">
              <i class="icon-video-large"></i>
            </div>
            <h4>No Preview</h4>
            <p>Add clips to timeline to see preview</p>
          </div>
        </div>
        
        <!-- Overlay controls -->
        <div class="preview-overlay" *ngIf="currentVideoSrc">
          <div class="playback-controls">
            <button class="play-btn" (click)="togglePlayback()">
              <i [class]="playback.playing ? 'icon-pause' : 'icon-play'"></i>
            </button>
          </div>
          
          <div class="preview-info">
            <div class="timecode">
              {{ formatTime(playback.position) }} / {{ formatTime(videoDuration) }}
            </div>
            <div class="resolution" *ngIf="videoWidth && videoHeight">
              {{ videoWidth }}x{{ videoHeight }}
            </div>
          </div>
        </div>
      </div>

      <div class="preview-footer">
        <div class="zoom-controls">
          <button class="btn btn-sm" (click)="zoomOut()">-</button>
          <span class="zoom-level">{{ (zoomLevel * 100) | number:'1.0-0' }}%</span>
          <button class="btn btn-sm" (click)="zoomIn()">+</button>
          <button class="btn btn-sm" (click)="fitToWindow()">Fit</button>
        </div>
        
        <div class="playback-speed">
          <select [(ngModel)]="playback.speed" (change)="updatePlaybackSpeed()">
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChild('viewport') viewport!: ElementRef<HTMLDivElement>;

  playback: PlaybackState = {
    playing: false,
    position: 0,
    speed: 1,
    loop: false,
    volume: 1,
    muted: false
  };

  currentVideoSrc = '';
  videoDuration = 0;
  videoWidth = 0;
  videoHeight = 0;
  zoomLevel = 1;
  panOffset = { x: 0, y: 0 };

  private destroy$ = new Subject<void>();
  private animationFrame: number | null = null;

  constructor(private timelineService: TimelineService) {}

  ngOnInit(): void {
    this.timelineService.playback$
      .pipe(takeUntil(this.destroy$))
      .subscribe(playback => {
        this.playback = playback;
        this.updateVideoPlayback();
      });

    this.timelineService.timeline$
      .pipe(takeUntil(this.destroy$))
      .subscribe(timeline => {
        this.updatePreviewFromTimeline(timeline);
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
    
    if (this.playback.playing && video.paused) {
      video.play().catch(console.error);
    } else if (!this.playback.playing && !video.paused) {
      video.pause();
    }
    
    // Sync position if difference is significant
    if (Math.abs(video.currentTime - this.playback.position) > 0.1) {
      video.currentTime = this.playback.position;
    }
    
    video.playbackRate = this.playback.speed;
    video.volume = this.playback.volume;
    video.muted = this.playback.muted;
  }

  private updatePreviewFromTimeline(timeline: any): void {
    // Find the clip at current position
    const currentClip = this.findClipAtPosition(timeline, this.playback.position);
    
    if (currentClip && currentClip.resource !== this.currentVideoSrc) {
      this.currentVideoSrc = currentClip.resource;
      
      // Update video position relative to clip
      setTimeout(() => {
        if (this.videoPlayer?.nativeElement) {
          const clipTime = this.playback.position - currentClip.start + currentClip.in;
          this.videoPlayer.nativeElement.currentTime = clipTime;
        }
      }, 100);
    } else if (!currentClip) {
      this.currentVideoSrc = '';
    }
  }

  private findClipAtPosition(timeline: any, position: number): any {
    // Check video tracks first
    for (const track of timeline.videoTracks) {
      for (const clip of track.clips) {
        if (position >= clip.start && position < clip.start + clip.duration) {
          return clip;
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
    if (this.playback.playing) {
      this.timelineService.setPlaybackPosition(video.currentTime);
    }
  }

  onVideoEnded(): void {
    if (this.playback.loop) {
      this.timelineService.setPlaybackPosition(0);
    } else {
      this.timelineService.togglePlayback();
    }
  }

  onVideoError(event: Event): void {
    console.error('Video playback error:', event);
    this.currentVideoSrc = '';
  }

  togglePlayback(): void {
    this.timelineService.togglePlayback();
  }

  updatePlaybackSpeed(): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.playbackRate = this.playback.speed;
    }
  }

  // Viewport controls
  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.1);
  }

  fitToWindow(): void {
    if (!this.viewport?.nativeElement || !this.videoWidth || !this.videoHeight) return;
    
    const container = this.viewport.nativeElement;
    const containerWidth = container.clientWidth - 40; // Account for padding
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
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 25); // Assuming 25fps
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }
}