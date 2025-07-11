import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material.module';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { VideoEditorService } from '../../services/video-editor.service';
import { VideoProject, Track, Clip, TrackType, TimelineState, PlaybackState } from '../../models/video-editor.models';

@Component({
  selector: 'app-professional-timeline',
  standalone: true,
  imports: [CommonModule, MaterialModule, DragDropModule],
  template: `
    <div class="timeline-container">
      <!-- Timeline Header -->
      <div class="timeline-header">
        <div class="timeline-controls">
          <button mat-icon-button (click)="addVideoTrack()" matTooltip="Add Video Track">
            <mat-icon>video_call</mat-icon>
          </button>
          <button mat-icon-button (click)="addAudioTrack()" matTooltip="Add Audio Track">
            <mat-icon>audiotrack</mat-icon>
          </button>
          <mat-divider [vertical]="true"></mat-divider>
          <button mat-icon-button (click)="zoomIn()" matTooltip="Zoom In">
            <mat-icon>zoom_in</mat-icon>
          </button>
          <button mat-icon-button (click)="zoomOut()" matTooltip="Zoom Out">
            <mat-icon>zoom_out</mat-icon>
          </button>
          <button mat-icon-button (click)="fitToWindow()" matTooltip="Fit to Window">
            <mat-icon>fit_screen</mat-icon>
          </button>
          <mat-divider [vertical]="true"></mat-divider>
          <button mat-icon-button 
                  [color]="timelineState.snapToGrid ? 'primary' : ''"
                  (click)="toggleSnap()" 
                  matTooltip="Toggle Snap to Grid">
            <mat-icon>grid_on</mat-icon>
          </button>
        </div>
        
        <div class="timeline-info">
          <span class="duration">Duration: {{ formatTime(project?.duration || 0) }}</span>
          <span class="zoom">Zoom: {{ (timelineState.zoom * 100) | number:'1.0-0' }}%</span>
        </div>
      </div>

      <!-- Time Ruler -->
      <div class="time-ruler" [style.width.px]="timelineWidth">
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

      <!-- Timeline Content -->
      <div class="timeline-content" #timelineContent>
        <!-- Track Headers -->
        <div class="track-headers">
          <div 
            class="track-header"
            *ngFor="let track of project?.tracks; trackBy: trackById"
            [style.height.px]="track.height"
          >
            <div class="track-controls">
              <button mat-icon-button 
                      [color]="track.muted ? 'warn' : ''"
                      (click)="toggleTrackMute(track)"
                      matTooltip="Mute Track">
                <mat-icon>{{ track.muted ? 'volume_off' : 'volume_up' }}</mat-icon>
              </button>
              <button mat-icon-button 
                      [color]="track.locked ? 'accent' : ''"
                      (click)="toggleTrackLock(track)"
                      matTooltip="Lock Track">
                <mat-icon>{{ track.locked ? 'lock' : 'lock_open' }}</mat-icon>
              </button>
              <button mat-icon-button 
                      *ngIf="track.type === 'video'"
                      [color]="!track.visible ? 'warn' : ''"
                      (click)="toggleTrackVisibility(track)"
                      matTooltip="Toggle Visibility">
                <mat-icon>{{ track.visible ? 'visibility' : 'visibility_off' }}</mat-icon>
              </button>
            </div>
            <div class="track-info">
              <span class="track-name">{{ track.name }}</span>
              <span class="track-type">{{ track.type.toUpperCase() }}</span>
            </div>
            <button mat-icon-button 
                    class="delete-track"
                    (click)="deleteTrack(track)"
                    matTooltip="Delete Track">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <!-- Timeline Tracks -->
        <div class="timeline-tracks" [style.width.px]="timelineWidth">
          <div 
            class="track-lane"
            *ngFor="let track of project?.tracks; trackBy: trackById"
            [style.height.px]="track.height"
            [style.background-color]="track.color + '10'"
            cdkDropList
            [cdkDropListData]="track"
            (cdkDropListDropped)="onClipDrop($event)"
          >
            <!-- Grid Lines -->
            <div class="grid-lines">
              <div 
                class="grid-line"
                *ngFor="let line of gridLines"
                [style.left.px]="line"
              ></div>
            </div>

            <!-- Clips -->
            <div 
              class="clip"
              *ngFor="let clip of track.clips; trackBy: clipById"
              [class.selected]="isClipSelected(clip.id)"
              [class.locked]="clip.locked"
              [style.left.px]="getClipPosition(clip)"
              [style.width.px]="getClipWidth(clip)"
              [style.background-color]="clip.color"
              [style.border-color]="track.color"
              (click)="selectClip(clip, $event)"
              (dblclick)="editClip(clip)"
              cdkDrag
              [cdkDragData]="clip"
              [cdkDragDisabled]="clip.locked || track.locked"
            >
              <!-- Clip Content -->
              <div class="clip-content">
                <div class="clip-thumbnail" *ngIf="getClipThumbnail(clip)">
                  <img [src]="getClipThumbnail(clip)" [alt]="clip.name" />
                </div>
                <div class="clip-info">
                  <span class="clip-name">{{ clip.name }}</span>
                  <span class="clip-duration">{{ formatTime(clip.duration) }}</span>
                </div>
              </div>

              <!-- Waveform for audio clips -->
              <div class="waveform" *ngIf="track.type === 'audio'">
                <div class="waveform-bars">
                  <div 
                    class="waveform-bar"
                    *ngFor="let bar of getWaveformData(clip); trackBy: trackByIndex"
                    [style.height.%]="bar"
                  ></div>
                </div>
              </div>

              <!-- Resize Handles -->
              <div class="resize-handles" *ngIf="isClipSelected(clip.id) && !clip.locked">
                <div class="resize-handle left" 
                     (mousedown)="startResize(clip, 'left', $event)"></div>
                <div class="resize-handle right" 
                     (mousedown)="startResize(clip, 'right', $event)"></div>
              </div>

              <!-- Effects Indicator -->
              <div class="effects-indicator" *ngIf="clip.effects.length > 0">
                <mat-icon>auto_fix_high</mat-icon>
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
            <div class="playhead-handle" 
                 (mousedown)="startPlayheadDrag($event)"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./professional-timeline.component.scss']
})
export class ProfessionalTimelineComponent implements OnInit, OnDestroy {
  @ViewChild('timelineContent') timelineContent!: ElementRef<HTMLDivElement>;

  project: VideoProject | null = null;
  timelineState!: TimelineState;
  playbackState!: PlaybackState;

  timelineWidth = 2000;
  timeMarkers: { time: string; position: number }[] = [];
  gridLines: number[] = [];
  playheadPosition = 0;
  totalTracksHeight = 0;

  private destroy$ = new Subject<void>();
  private isDraggingPlayhead = false;
  private isResizing = false;
  private resizingClip: Clip | null = null;
  private resizeMode: 'left' | 'right' = 'left';

  constructor(private videoEditorService: VideoEditorService) {}

  ngOnInit(): void {
    // Subscribe to project changes
    combineLatest([
      this.videoEditorService.getCurrentProject(),
      this.videoEditorService.getTimelineState(),
      this.videoEditorService.getPlaybackState()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([project, timelineState, playbackState]) => {
        this.project = project;
        this.timelineState = timelineState;
        this.playbackState = playbackState;
        
        if (project) {
          this.updateTimelineView();
          this.updatePlayheadPosition();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDraggingPlayhead) {
      this.updatePlayheadFromMouse(event);
    } else if (this.isResizing && this.resizingClip) {
      this.updateClipResize(event);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.isDraggingPlayhead = false;
    this.isResizing = false;
    this.resizingClip = null;
  }

  // Track Management
  addVideoTrack(): void {
    this.videoEditorService.addTrack(TrackType.VIDEO);
  }

  addAudioTrack(): void {
    this.videoEditorService.addTrack(TrackType.AUDIO);
  }

  deleteTrack(track: Track): void {
    if (confirm(`Delete track "${track.name}"?`)) {
      this.videoEditorService.removeTrack(track.id);
    }
  }

  toggleTrackMute(track: Track): void {
    this.videoEditorService.updateTrack(track.id, { muted: !track.muted });
  }

  toggleTrackLock(track: Track): void {
    this.videoEditorService.updateTrack(track.id, { locked: !track.locked });
  }

  toggleTrackVisibility(track: Track): void {
    this.videoEditorService.updateTrack(track.id, { visible: !track.visible });
  }

  // Clip Management
  selectClip(clip: Clip, event: MouseEvent): void {
    event.stopPropagation();
    this.videoEditorService.selectClip(clip.id, event.ctrlKey || event.metaKey);
  }

  editClip(clip: Clip): void {
    // Open clip properties dialog
    console.log('Edit clip:', clip);
  }

  onClipDrop(event: CdkDragDrop<Track>): void {
    const clip = event.item.data as Clip;
    const targetTrack = event.container.data;
    
    if (clip && targetTrack) {
      // Calculate new position based on drop location
      const rect = event.container.element.nativeElement.getBoundingClientRect();
      const dropX = event.dropPoint.x - rect.left;
      const newStartTime = this.pixelsToTime(dropX);
      
      this.videoEditorService.moveClip(clip.id, targetTrack.id, newStartTime);
    }
  }

  startResize(clip: Clip, mode: 'left' | 'right', event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizingClip = clip;
    this.resizeMode = mode;
  }

  // Timeline Controls
  zoomIn(): void {
    this.videoEditorService.setZoom(this.timelineState.zoom * 1.2);
  }

  zoomOut(): void {
    this.videoEditorService.setZoom(this.timelineState.zoom / 1.2);
  }

  fitToWindow(): void {
    if (this.project && this.timelineContent) {
      const containerWidth = this.timelineContent.nativeElement.clientWidth - 200; // Account for headers
      const contentWidth = this.project.duration * 50; // Base scale
      const optimalZoom = containerWidth / contentWidth;
      this.videoEditorService.setZoom(Math.max(0.1, optimalZoom));
    }
  }

  toggleSnap(): void {
    this.videoEditorService.toggleSnapToGrid();
  }

  // Playhead Control
  startPlayheadDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDraggingPlayhead = true;
  }

  // Utility Methods
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getClipPosition(clip: Clip): number {
    return this.timeToPixels(clip.startTime);
  }

  getClipWidth(clip: Clip): number {
    return this.timeToPixels(clip.duration);
  }

  getClipThumbnail(clip: Clip): string | null {
    // Get thumbnail from media asset
    return null; // Implement based on your media asset structure
  }

  getWaveformData(clip: Clip): number[] {
    // Generate or retrieve waveform data
    const bars = Math.floor(this.getClipWidth(clip) / 2);
    return Array.from({ length: bars }, () => Math.random() * 100);
  }

  isClipSelected(clipId: string): boolean {
    return this.timelineState.selectedClips.includes(clipId);
  }

  trackById(index: number, track: Track): string {
    return track.id;
  }

  clipById(index: number, clip: Clip): string {
    return clip.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Private Methods
  private updateTimelineView(): void {
    if (!this.project) return;
    
    this.timelineWidth = Math.max(2000, this.project.duration * this.timelineState.zoom * 50);
    this.generateTimeMarkers();
    this.generateGridLines();
    this.calculateTotalHeight();
  }

  private generateTimeMarkers(): void {
    if (!this.project) return;
    
    this.timeMarkers = [];
    const interval = this.getTimeInterval();
    
    for (let time = 0; time <= this.project.duration; time += interval) {
      this.timeMarkers.push({
        time: this.formatTime(time),
        position: this.timeToPixels(time)
      });
    }
  }

  private generateGridLines(): void {
    if (!this.timelineState.snapToGrid) {
      this.gridLines = [];
      return;
    }
    
    this.gridLines = [];
    const gridInterval = this.timelineState.gridSize;
    const maxTime = this.project?.duration || 60;
    
    for (let time = 0; time <= maxTime; time += gridInterval) {
      this.gridLines.push(this.timeToPixels(time));
    }
  }

  private getTimeInterval(): number {
    const zoom = this.timelineState.zoom;
    if (zoom > 2) return 1;
    if (zoom > 1) return 5;
    if (zoom > 0.5) return 10;
    return 30;
  }

  private calculateTotalHeight(): void {
    if (!this.project) return;
    
    this.totalTracksHeight = this.project.tracks.reduce((total, track) => total + track.height, 0);
  }

  private updatePlayheadPosition(): void {
    this.playheadPosition = this.timeToPixels(this.playbackState.currentTime);
  }

  private timeToPixels(time: number): number {
    return time * this.timelineState.zoom * 50;
  }

  private pixelsToTime(pixels: number): number {
    return pixels / (this.timelineState.zoom * 50);
  }

  private updatePlayheadFromMouse(event: MouseEvent): void {
    if (!this.timelineContent) return;
    
    const rect = this.timelineContent.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - 200; // Account for track headers
    const time = this.pixelsToTime(Math.max(0, x));
    
    this.videoEditorService.seek(time);
  }

  private updateClipResize(event: MouseEvent): void {
    if (!this.resizingClip || !this.timelineContent) return;
    
    const rect = this.timelineContent.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - 200;
    const time = this.pixelsToTime(Math.max(0, x));
    
    if (this.resizeMode === 'left') {
      const maxIn = this.resizingClip.endTime - 0.1;
      const newStartTime = Math.min(time, maxIn);
      const newInPoint = this.resizingClip.inPoint + (newStartTime - this.resizingClip.startTime);
      
      this.videoEditorService.updateClip(this.resizingClip.id, {
        startTime: newStartTime,
        inPoint: Math.max(0, newInPoint)
      });
    } else {
      const minOut = this.resizingClip.startTime + 0.1;
      const newEndTime = Math.max(time, minOut);
      const newOutPoint = this.resizingClip.outPoint + (newEndTime - this.resizingClip.endTime);
      
      this.videoEditorService.updateClip(this.resizingClip.id, {
        endTime: newEndTime,
        outPoint: newOutPoint
      });
    }
  }
}