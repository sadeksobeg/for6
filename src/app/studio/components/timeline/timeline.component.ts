import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { TimelineService } from '../../services/timeline.service';
import { Timeline, VideoClip, AudioClip, VideoTrack, AudioTrack } from '../../models/studio.models';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="timeline-container" #timelineContainer>
      <!-- Timeline Header -->
      <div class="timeline-header">
        <div class="timeline-controls">
          <button class="btn btn-sm" (click)="addVideoTrack()">
            <i class="icon-plus"></i> Video Track
          </button>
          <button class="btn btn-sm" (click)="addAudioTrack()">
            <i class="icon-plus"></i> Audio Track
          </button>
          <div class="zoom-controls">
            <button class="btn btn-sm" (click)="zoomOut()">-</button>
            <span class="zoom-level">{{ (timeline.scale * 100) | number:'1.0-0' }}%</span>
            <button class="btn btn-sm" (click)="zoomIn()">+</button>
          </div>
        </div>
        
        <!-- Time Ruler -->
        <div class="time-ruler" [style.width.px]="timelineWidth">
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

      <!-- Timeline Tracks -->
      <div class="timeline-tracks" #tracksContainer>
        <!-- Video Tracks -->
        <div 
          class="track video-track" 
          *ngFor="let track of timeline.videoTracks; trackBy: trackById"
          [style.height.px]="track.height"
        >
          <div class="track-header">
            <div class="track-controls">
              <button 
                class="track-btn mute" 
                [class.active]="track.muted"
                (click)="toggleTrackMute(track)"
              >
                M
              </button>
              <button 
                class="track-btn lock" 
                [class.active]="track.locked"
                (click)="toggleTrackLock(track)"
              >
                L
              </button>
              <button 
                class="track-btn hide" 
                [class.active]="track.hidden"
                (click)="toggleTrackVisibility(track)"
              >
                H
              </button>
            </div>
            <span class="track-name">{{ track.name }}</span>
          </div>
          
          <div 
            class="track-content"
            cdkDropList
            [cdkDropListData]="{ trackId: track.id, type: 'video' }"
            (cdkDropListDropped)="onClipDrop($event)"
            [style.width.px]="timelineWidth"
          >
            <div 
              class="clip video-clip"
              *ngFor="let clip of track.clips; trackBy: clipById"
              [class.selected]="clip.selected"
              [style.left.px]="getClipPosition(clip)"
              [style.width.px]="getClipWidth(clip)"
              (click)="selectClip(clip, $event)"
              (dblclick)="editClip(clip)"
              cdkDrag
              [cdkDragData]="clip"
            >
              <div class="clip-thumbnail" *ngIf="clip.thumbnail">
                <img [src]="clip.thumbnail" [alt]="clip.name" />
              </div>
              <div class="clip-content">
                <div class="clip-name">{{ clip.name }}</div>
                <div class="clip-duration">{{ formatDuration(clip.duration) }}</div>
              </div>
              <div class="clip-handles">
                <div class="handle left" (mousedown)="startTrimming(clip, 'in', $event)"></div>
                <div class="handle right" (mousedown)="startTrimming(clip, 'out', $event)"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Audio Tracks -->
        <div 
          class="track audio-track" 
          *ngFor="let track of timeline.audioTracks; trackBy: trackById"
          [style.height.px]="track.height"
        >
          <div class="track-header">
            <div class="track-controls">
              <button 
                class="track-btn mute" 
                [class.active]="track.muted"
                (click)="toggleTrackMute(track)"
              >
                M
              </button>
              <button 
                class="track-btn lock" 
                [class.active]="track.locked"
                (click)="toggleTrackLock(track)"
              >
                L
              </button>
            </div>
            <span class="track-name">{{ track.name }}</span>
          </div>
          
          <div 
            class="track-content"
            cdkDropList
            [cdkDropListData]="{ trackId: track.id, type: 'audio' }"
            (cdkDropListDropped)="onClipDrop($event)"
            [style.width.px]="timelineWidth"
          >
            <div 
              class="clip audio-clip"
              *ngFor="let clip of track.clips; trackBy: clipById"
              [class.selected]="clip.selected"
              [style.left.px]="getClipPosition(clip)"
              [style.width.px]="getClipWidth(clip)"
              (click)="selectClip(clip, $event)"
              cdkDrag
              [cdkDragData]="clip"
            >
              <div class="waveform" *ngIf="clip.waveform">
                <div 
                  class="waveform-bar"
                  *ngFor="let bar of clip.waveform; trackBy: trackByIndex"
                  [style.height.%]="bar"
                ></div>
              </div>
              <div class="clip-content">
                <div class="clip-name">{{ clip.name }}</div>
              </div>
              <div class="clip-handles">
                <div class="handle left" (mousedown)="startTrimming(clip, 'in', $event)"></div>
                <div class="handle right" (mousedown)="startTrimming(clip, 'out', $event)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Playhead -->
      <div 
        class="playhead"
        [style.left.px]="playheadPosition"
        [style.height.px]="totalTracksHeight"
      >
        <div class="playhead-line"></div>
        <div 
          class="playhead-handle"
          (mousedown)="startPlayheadDrag($event)"
        ></div>
      </div>
    </div>
  `,
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnDestroy {
  @ViewChild('timelineContainer') timelineContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('tracksContainer') tracksContainer!: ElementRef<HTMLDivElement>;

  @Input() timeline: any;
  @Input() dragOverTrackId: string | null = null;
  @Input() ghostClip: any;
  @Input() onTrackDragOver: any;
  @Input() onTrackDragLeave: any;
  @Input() onDrop: any;

  timeMarkers: { time: string; position: number }[] = [];
  timelineWidth = 1000;
  playheadPosition = 0;
  totalTracksHeight = 0;

  private destroy$ = new Subject<void>();
  private isDraggingPlayhead = false;
  private isTrimming = false;
  private trimmingClip: VideoClip | AudioClip | null = null;
  private trimmingMode: 'in' | 'out' = 'in';

  constructor(private timelineService: TimelineService) {}

  ngOnInit(): void {
    this.timelineService.timeline$
      .pipe(takeUntil(this.destroy$))
      .subscribe(timeline => {
        this.timeline = timeline;
        this.updateTimelineView();
      });

    this.timelineService.playback$
      .pipe(takeUntil(this.destroy$))
      .subscribe(playback => {
        this.playheadPosition = this.timeToPixels(playback.position);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDraggingPlayhead) {
      this.updatePlayheadPosition(event);
    } else if (this.isTrimming && this.trimmingClip) {
      this.updateTrimming(event);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.isDraggingPlayhead = false;
    this.isTrimming = false;
    this.trimmingClip = null;
  }

  private updateTimelineView(): void {
    this.timelineWidth = Math.max(1000, this.timeline.duration * this.timeline.scale * 50);
    this.generateTimeMarkers();
    this.calculateTracksHeight();
  }

  private generateTimeMarkers(): void {
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
    const scale = this.timeline.scale;
    if (scale > 2) return 1;
    if (scale > 1) return 5;
    if (scale > 0.5) return 10;
    return 30;
  }

  private calculateTracksHeight(): void {
    this.totalTracksHeight = 
      (this.timeline.videoTracks.length + this.timeline.audioTracks.length) * 50 + 40;
  }

  private timeToPixels(time: number): number {
    return time * this.timeline.scale * 50;
  }

  private pixelsToTime(pixels: number): number {
    return pixels / (this.timeline.scale * 50);
  }

  getClipPosition(clip: VideoClip | AudioClip): number {
    return this.timeToPixels(clip.start);
  }

  getClipWidth(clip: VideoClip | AudioClip): number {
    return this.timeToPixels(clip.duration);
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    return this.formatTime(seconds);
  }

  // Track operations
  addVideoTrack(): void {
    this.timelineService.addVideoTrack();
  }

  addAudioTrack(): void {
    this.timelineService.addAudioTrack();
  }

  toggleTrackMute(track: VideoTrack | AudioTrack): void {
    track.muted = !track.muted;
  }

  toggleTrackLock(track: VideoTrack | AudioTrack): void {
    track.locked = !track.locked;
  }

  toggleTrackVisibility(track: VideoTrack): void {
    track.hidden = !track.hidden;
  }

  // Zoom operations
  zoomIn(): void {
    this.timelineService.setTimelineScale(this.timeline.scale * 1.2);
  }

  zoomOut(): void {
    this.timelineService.setTimelineScale(this.timeline.scale / 1.2);
  }

  // Clip operations
  selectClip(clip: VideoClip | AudioClip, event: MouseEvent): void {
    event.stopPropagation();
    this.timelineService.selectClip(clip.id, event.ctrlKey || event.metaKey);
  }

  editClip(clip: VideoClip | AudioClip): void {
    // Open clip properties panel
    console.log('Edit clip:', clip);
  }

  onClipDrop(event: CdkDragDrop<any>): void {
    const dragData = event.item.data;
    const dropData = event.container.data;
    
    if (dragData && dropData) {
      const rect = event.container.element.nativeElement.getBoundingClientRect();
      const dropX = event.dropPoint.x - rect.left;
      const newStart = this.pixelsToTime(dropX);
      
      if (dragData.id) {
        // Moving existing clip
        this.timelineService.moveClip(dragData.id, newStart, dropData.trackId);
      } else if (dragData.resource) {
        // Adding new clip from resource
        this.addClipFromResource(dragData.resource, dropData.trackId, newStart);
      }
    }
  }

  private addClipFromResource(resource: any, trackId: string, start: number): void {
    if (resource.type === 'video') {
      const clip: VideoClip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: resource.name,
        resource: resource.path,
        in: 0,
        out: resource.duration,
        start: start,
        duration: resource.duration,
        trackIndex: 0,
        selected: false,
        thumbnail: resource.thumbnail,
        filters: [],
        properties: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          opacity: 1,
          blend_mode: 'normal'
        }
      };
      this.timelineService.addClipToTrack(clip, trackId);
    } else if (resource.type === 'audio') {
      const clip: AudioClip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: resource.name,
        resource: resource.path,
        in: 0,
        out: resource.duration,
        start: start,
        duration: resource.duration,
        trackIndex: 0,
        selected: false,
        volume: 1,
        filters: []
      };
      this.timelineService.addClipToTrack(clip, trackId);
    }
  }

  // Playhead operations
  startPlayheadDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDraggingPlayhead = true;
  }

  private updatePlayheadPosition(event: MouseEvent): void {
    if (!this.timelineContainer) return;
    
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - 200; // Account for track headers
    const time = this.pixelsToTime(Math.max(0, x));
    
    this.timelineService.setPlaybackPosition(time);
  }

  // Trimming operations
  startTrimming(clip: VideoClip | AudioClip, mode: 'in' | 'out', event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isTrimming = true;
    this.trimmingClip = clip;
    this.trimmingMode = mode;
  }

  private updateTrimming(event: MouseEvent): void {
    if (!this.trimmingClip || !this.timelineContainer) return;
    
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - 200;
    const time = this.pixelsToTime(Math.max(0, x));
    
    if (this.trimmingMode === 'in') {
      const maxIn = this.trimmingClip.start + this.trimmingClip.duration - 0.1;
      this.trimmingClip.in = Math.max(0, Math.min(time - this.trimmingClip.start, maxIn));
    } else {
      const minOut = this.trimmingClip.start + 0.1;
      this.trimmingClip.out = Math.max(minOut, time - this.trimmingClip.start);
    }
    
    this.trimmingClip.duration = this.trimmingClip.out - this.trimmingClip.in;
  }

  // TrackBy functions
  trackById(index: number, item: any): string {
    return item.id;
  }

  clipById(index: number, clip: VideoClip | AudioClip): string {
    return clip.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}