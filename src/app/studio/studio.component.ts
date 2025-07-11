import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Import our new services and components
import { TimelineService } from './services/timeline.service';
import { MediaService } from '@proxy/medias/media.service';
import { VideoEditingApiService } from './services/video-editing-api.service';
import { TimelineComponent } from './components/timeline/timeline.component';
import { MediaBinComponent } from './components/media-bin/media-bin.component';
import { PreviewComponent } from './components/preview/preview.component';
import { TimelineVisualizerComponent } from './components/timeline-visualizer/timeline-visualizer.component';
import { Timeline, PlaybackState, Resource } from './models/studio.models';
import { MediaDto } from '@proxy/medias/models';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    TimelineComponent,
    MediaBinComponent,
    PreviewComponent,
    TimelineVisualizerComponent
  ],
  templateUrl: './studio.component.html',
  styleUrls: ['./studio.component.scss']
})
export class StudioComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Application state
  timeline: Timeline = {
    fps: 25,
    width: 1920,
    height: 1080,
    duration: 60, // Set a default duration for the timeline
    position: 0,
    scale: 1,
    videoTracks: [
      { id: 'V1', name: 'V1', clips: [], locked: false, hidden: false, muted: false, height: 48 },
      { id: 'V2', name: 'V2', clips: [], locked: false, hidden: false, muted: false, height: 48 },
      { id: 'V3', name: 'V3', clips: [], locked: false, hidden: false, muted: false, height: 48 }
    ],
    audioTracks: []
  };

  playback: PlaybackState = {
    playing: false,
    position: 0,
    speed: 1,
    loop: false,
    volume: 1,
    muted: false
  };

  resources: Resource[] = [];
  projectName = 'Untitled Project';
  isFullscreen = false;
  activeRightPanel: 'visualizer' | 'console' = 'visualizer';

  mediaList: MediaDto[] = [];

  // Drag-and-drop state
  draggingMedia: MediaDto | null = null;
  dragOverTrackId: string | null = null;
  ghostClip: { trackId: string, start: number, duration: number, color: string } | null = null;
  // Utility for pastel colors
  private pastelColors = [
    '#ffd6e0', '#d6eaff', '#e0ffd6', '#fffad6', '#e0d6ff', '#d6fff6', '#ffe0d6'
  ];
  private randomPastel() {
    return this.pastelColors[Math.floor(Math.random() * this.pastelColors.length)];
  }
  private generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private destroy$ = new Subject<void>();

  constructor(
    private timelineService: TimelineService,
    private mediaService: MediaService, // <-- use backend MediaService
    private apiService: VideoEditingApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    this.timelineService.timeline$
      .pipe(takeUntil(this.destroy$))
      .subscribe(timeline => {
        this.timeline = timeline;
      });

    this.timelineService.playback$
      .pipe(takeUntil(this.destroy$))
      .subscribe(playback => {
        this.playback = playback;
      });

    // Fetch all media (videos)
    this.mediaService.getList({ sorting: '', skipCount: 0, maxResultCount: 100 })
      .subscribe(result => {
        this.mediaList = result.items || [];
      });

    // Initialize API service with default project
    this.apiService.createProject('Professional Video Project');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.timelineService.togglePlayback();
        break;
      case 'KeyV':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setTool('pointer');
        }
        break;
      case 'KeyC':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setTool('razor');
        }
        break;
      case 'KeyS':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.toggleSnapping();
        } else if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.saveProject();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.timelineService.selectedClipsValue.length > 0) {
          event.preventDefault();
          this.timelineService.deleteSelectedClips();
        }
        break;
      case 'KeyZ':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) {
            // this.redo();
          } else {
            // this.undo();
          }
        }
        break;
      case 'KeyY':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // this.redo();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          this.timelineService.setPlaybackPosition(this.playback.position - 1);
        } else {
          this.timelineService.setPlaybackPosition(this.playback.position - 0.04);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          this.timelineService.setPlaybackPosition(this.playback.position + 1);
        } else {
          this.timelineService.setPlaybackPosition(this.playback.position + 0.04);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.timelineService.setPlaybackPosition(0);
        break;
      case 'End':
        event.preventDefault();
        this.timelineService.setPlaybackPosition(this.timeline.duration);
        break;
    }
  }

  // Tool methods
  toggleSnapping(): void {
    // Toggle snapping functionality
    console.log('Toggle snapping');
  }

  // File import
  importMedia(): void {
    this.fileInput.nativeElement.click();
  }

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      // Removed the block that calls addResource, since it's not available on backend MediaService
    }
    
    input.value = '';
  }

  // Project management
  saveProject(): void {
    console.log('Saving project...');
  }

  exportProject(): void {
    console.log('Exporting project...');
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  toggleApiConsole(): void {
    this.activeRightPanel = this.activeRightPanel === 'console' ? 'visualizer' : 'console';
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private setTool(tool: string): void {
    console.log(`Selected tool: ${tool}`);
  }

  addToTimeline(media: MediaDto) {
    const videoTrack = this.timeline.videoTracks[0];
    if (videoTrack) {
      const clip = {
        id: media.id,
        name: media.title || media.id,
        resource: `/api/app/media/download-video/${media.id}`,
        in: 0,
        out: 10,
        start: 0,
        duration: 10,
        trackIndex: 0,
        selected: false,
        filters: [],
        properties: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          opacity: 1,
          blend_mode: 'normal'
        }
      };
      this.timelineService.addClipToTrack(clip, videoTrack.id);
    }
  }

  downloadVideo(media: MediaDto) {
    this.mediaService.downloadVideo(media.id).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (media.title || media.id) + '.mp4';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  deleteVideo(media: MediaDto) {
    if (confirm('Are you sure you want to delete this video?')) {
      this.mediaService.delete(media.id).subscribe(() => {
        this.mediaList = this.mediaList.filter(m => m.id !== media.id);
      });
    }
  }


  // --- Modern Drag-and-Drop Handlers ---
  onDragStart(event: DragEvent, media: MediaDto) {
    this.draggingMedia = media;
    event.dataTransfer?.setData('application/json', JSON.stringify(media));
    event.dataTransfer!.effectAllowed = 'copy';
  }

  onTrackDragOver(event: DragEvent, track: any) {
    event.preventDefault();
    if (!this.draggingMedia) return;
    this.dragOverTrackId = track.id;
    const timelineRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = event.clientX - timelineRect.left;
    const pxPerSec = timelineRect.width / (this.timeline.duration || 60);
    let startTime = mouseX / pxPerSec;
    const fps = this.timeline.fps || 25;
    const snapTime = Math.round(startTime * fps) / fps;
    this.ghostClip = {
      trackId: track.id,
      start: snapTime,
      duration: (this.draggingMedia as any)?.duration || 5,
      color: this.randomPastel()
    };
  }

  onTrackDragLeave(event: DragEvent, track: any) {
    this.dragOverTrackId = null;
    this.ghostClip = null;
  }

  async onDrop(event: DragEvent, track: any) {
    event.preventDefault();
    const media: any = this.draggingMedia || JSON.parse(event.dataTransfer?.getData('application/json') || '{}');
    this.draggingMedia = null;
    this.dragOverTrackId = null;
    this.ghostClip = null;
    // Compute drop time
    const timelineRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = event.clientX - timelineRect.left;
    const pxPerSec = timelineRect.width / (this.timeline.duration || 60);
    let startTime = mouseX / pxPerSec;
    const fps = this.timeline.fps || 25;
    const snapTime = Math.round(startTime * fps) / fps;
    try {
      const clip = {
        id: this.generateUUID(),
        name: media.title || media.filename || media.id,
        resource: `/api/app/media/download-video/${media.id}`,
        in: 0,
        out: media.duration,
        start: snapTime,
        duration: media.duration,
        trackIndex: 0,
        selected: false,
        color: this.randomPastel(),
        filters: [],
        properties: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          opacity: 1,
          blend_mode: 'normal'
        }
      };
      // Optimistically add to timeline
      this.timelineService.addClipToTrack(clip, track.id);
      this.renderTimeline(this.timeline);
      // Optionally: POST to backend for persistence (using your TimelineService)
      // await this.timelineService.persistClip(clip, track.id); // implement as needed
    } catch (err) {
      this.showToast(`Could not add '${media.filename || media.title}' at ${this.formatTime(snapTime)}. Please try again.`);
      // Optionally: rollback UI
    }
  }

  renderTimeline(timeline: any) {
    // This can trigger change detection or re-render logic if needed
    this.cdr.detectChanges();
  }

  showToast(msg: string) {
    // Simple toast (replace with your own)
    alert(msg);
  }
}