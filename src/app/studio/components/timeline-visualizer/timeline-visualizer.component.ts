import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { VideoEditingApiService, Timeline, Track, Clip } from '../../services/video-editing-api.service';

@Component({
  selector: 'app-timeline-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-visualizer">
      <div class="visualizer-header">
        <h3>Timeline Visualizer</h3>
        <div class="timeline-info" *ngIf="timeline">
          <span>Duration: {{ formatTime(timeline.duration) }}</span>
          <span>Tracks: {{ timeline.tracks.length }}</span>
          <span>FPS: {{ timeline.fps }}</span>
        </div>
      </div>
      
      <div class="timeline-container" *ngIf="timeline; else noTimeline">
        <!-- Time Ruler -->
        <div class="time-ruler">
          <div class="ruler-track-header"></div>
          <div class="ruler-content">
            <div 
              class="time-marker"
              *ngFor="let marker of timeMarkers"
              [style.left.px]="marker.position"
            >
              <span class="time-label">{{ marker.time }}</span>
              <div class="marker-line"></div>
            </div>
          </div>
        </div>
        
        <!-- Playhead -->
        <div class="playhead" [style.left.px]="playheadPosition + 200">
          <div class="playhead-line"></div>
          <div class="playhead-handle"></div>
        </div>
        
        <!-- Tracks -->
        <div class="tracks-container">
          <div 
            class="track"
            *ngFor="let track of timeline.tracks; trackBy: trackById"
            [class.video-track]="track.type === 'video'"
            [class.audio-track]="track.type === 'audio'"
          >
            <div class="track-header">
              <div class="track-controls">
                <button 
                  class="track-btn mute"
                  [class.active]="track.muted"
                  title="Mute"
                >
                  M
                </button>
                <button 
                  class="track-btn lock"
                  [class.active]="track.locked"
                  title="Lock"
                >
                  L
                </button>
              </div>
              <div class="track-info">
                <span class="track-name">{{ track.name }}</span>
                <span class="track-type">{{ track.type.toUpperCase() }}</span>
              </div>
            </div>
            
            <div class="track-content" [style.width.px]="timelineWidth">
              <div 
                class="clip"
                *ngFor="let clip of track.clips; trackBy: clipById"
                [style.left.px]="getClipPosition(clip)"
                [style.width.px]="getClipWidth(clip)"
                [style.background-color]="clip.color"
                [title]="getClipTooltip(clip)"
              >
                <div class="clip-content">
                  <div class="clip-name">{{ clip.filename }}</div>
                  <div class="clip-duration">{{ formatTime(clip.duration) }}</div>
                </div>
                
                <!-- Thumbnail for video clips -->
                <div class="clip-thumbnail" *ngIf="track.type === 'video' && clip.thumbnail">
                  <img [src]="clip.thumbnail" [alt]="clip.filename" />
                </div>
                
                <!-- Waveform for audio clips -->
                <div class="clip-waveform" *ngIf="track.type === 'audio'">
                  <div class="waveform-placeholder">♪</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ng-template #noTimeline>
        <div class="no-timeline">
          <div class="no-timeline-icon">🎬</div>
          <h4>No Timeline</h4>
          <p>Create a project to see timeline visualization</p>
        </div>
      </ng-template>
    </div>
  `,
  styleUrls: ['./timeline-visualizer.component.scss']
})
export class TimelineVisualizerComponent implements OnInit, OnDestroy {
  timeline: Timeline | null = null;
  timeMarkers: { time: string; position: number }[] = [];
  timelineWidth = 1000;
  playheadPosition = 0;
  scale = 50; // pixels per second

  private destroy$ = new Subject<void>();

  constructor(private apiService: VideoEditingApiService) {}

  ngOnInit(): void {
    this.apiService.timeline
      .pipe(takeUntil(this.destroy$))
      .subscribe(timeline => {
        this.timeline = timeline;
        if (timeline) {
          this.updateTimelineView();
        }
      });

    this.apiService.playbackState
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.playheadPosition = this.timeToPixels(state.position);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateTimelineView(): void {
    if (!this.timeline) return;
    
    this.timelineWidth = Math.max(1000, this.timeline.duration * this.scale);
    this.generateTimeMarkers();
  }

  private generateTimeMarkers(): void {
    if (!this.timeline) return;
    
    this.timeMarkers = [];
    const interval = this.getTimeInterval();
    
    for (let time = 0; time <= this.timeline.duration; time += interval) {
      this.timeMarkers.push({
        time: this.formatTime(time),
        position: this.timeToPixels(time)
      });
    }
  }

  private getTimeInterval(): number {
    if (this.scale > 100) return 1;
    if (this.scale > 50) return 5;
    if (this.scale > 20) return 10;
    return 30;
  }

  private timeToPixels(time: number): number {
    return time * this.scale;
  }

  getClipPosition(clip: Clip): number {
    return this.timeToPixels(clip.start);
  }

  getClipWidth(clip: Clip): number {
    return this.timeToPixels(clip.duration);
  }

  getClipTooltip(clip: Clip): string {
    return `${clip.filename}\nStart: ${this.formatTime(clip.start)}\nDuration: ${this.formatTime(clip.duration)}\nEnd: ${this.formatTime(clip.end)}`;
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * (this.timeline?.fps || 25));
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }

  trackById(index: number, track: Track): string {
    return track.id;
  }

  clipById(index: number, clip: Clip): string {
    return clip.id;
  }
}