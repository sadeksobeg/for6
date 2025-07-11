import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoEditorService } from './services/video-editor.service';
import { ProfessionalTimelineComponent } from './components/professional-timeline/professional-timeline.component';
import { MediaLibraryComponent } from './components/media-library/media-library.component';
import { VideoPreviewComponent } from './components/video-preview/video-preview.component';
import { VideoProject, PlaybackState, TimelineState } from './models/video-editor.models';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ProfessionalTimelineComponent,
    MediaLibraryComponent,
    VideoPreviewComponent
  ],
  template: `
    <div class="studio-container">
      <!-- Top Toolbar -->
      <mat-toolbar class="studio-toolbar" color="primary">
        <div class="toolbar-left">
          <mat-icon class="studio-logo">movie</mat-icon>
          <span class="studio-title">Professional Video Editor</span>
          <span class="project-name" *ngIf="currentProject">- {{ currentProject.name }}</span>
        </div>
        
        <div class="toolbar-center">
          <div class="playback-controls">
            <button mat-icon-button (click)="previousFrame()" matTooltip="Previous Frame">
              <mat-icon>skip_previous</mat-icon>
            </button>
            <button mat-icon-button (click)="togglePlayback()" matTooltip="Play/Pause">
              <mat-icon>{{ playbackState?.isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>
            <button mat-icon-button (click)="nextFrame()" matTooltip="Next Frame">
              <mat-icon>skip_next</mat-icon>
            </button>
            <button mat-icon-button (click)="stop()" matTooltip="Stop">
              <mat-icon>stop</mat-icon>
            </button>
          </div>
          
          <div class="timecode-display">
            {{ formatTime(playbackState?.currentTime || 0) }}
          </div>
        </div>
        
        <div class="toolbar-right">
          <button mat-icon-button [matMenuTriggerFor]="fileMenu" matTooltip="File Menu">
            <mat-icon>folder</mat-icon>
          </button>
          <button mat-icon-button (click)="saveProject()" matTooltip="Save Project">
            <mat-icon>save</mat-icon>
          </button>
          <button mat-raised-button color="accent" (click)="exportProject()" matTooltip="Export Video">
            <mat-icon>file_download</mat-icon>
            Export
          </button>
        </div>
      </mat-toolbar>

      <!-- File Menu -->
      <mat-menu #fileMenu="matMenu">
        <button mat-menu-item (click)="newProject()">
          <mat-icon>add</mat-icon>
          <span>New Project</span>
        </button>
        <button mat-menu-item (click)="openProject()">
          <mat-icon>folder_open</mat-icon>
          <span>Open Project</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="saveProject()">
          <mat-icon>save</mat-icon>
          <span>Save Project</span>
        </button>
        <button mat-menu-item (click)="saveProjectAs()">
          <mat-icon>save_as</mat-icon>
          <span>Save As...</span>
        </button>
      </mat-menu>

      <!-- Main Content -->
      <div class="studio-content">
        <!-- Left Panel - Media Library -->
        <div class="left-panel">
          <app-media-library></app-media-library>
        </div>

        <!-- Center Panel - Preview -->
        <div class="center-panel">
          <app-video-preview></app-video-preview>
        </div>

        <!-- Right Panel - Properties (Future) -->
        <div class="right-panel" *ngIf="showPropertiesPanel">
          <mat-card class="properties-panel">
            <mat-card-header>
              <mat-card-title>Properties</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Clip properties and effects will be shown here.</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Bottom Panel - Timeline -->
      <div class="bottom-panel">
        <app-professional-timeline></app-professional-timeline>
      </div>

      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-left">
          <span class="status-item">
            Duration: {{ formatTime(currentProject?.duration || 0) }}
          </span>
          <span class="status-item">
            FPS: {{ currentProject?.fps || 30 }}
          </span>
          <span class="status-item">
            Resolution: {{ currentProject?.resolution?.width || 1920 }}x{{ currentProject?.resolution?.height || 1080 }}
          </span>
        </div>
        
        <div class="status-right">
          <span class="status-item">
            Zoom: {{ (timelineState?.zoom || 1) * 100 | number:'1.0-0' }}%
          </span>
          <span class="status-item" [class.active]="timelineState?.snapToGrid">
            <mat-icon class="status-icon">grid_on</mat-icon>
            Snap
          </span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./studio.component.scss']
})
export class StudioComponent implements OnInit, OnDestroy {
  currentProject: VideoProject | null = null;
  playbackState: PlaybackState | null = null;
  timelineState: TimelineState | null = null;
  showPropertiesPanel = false;

  private destroy$ = new Subject<void>();

  constructor(
    private videoEditorService: VideoEditorService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Subscribe to project state
    this.videoEditorService.getCurrentProject()
      .pipe(takeUntil(this.destroy$))
      .subscribe(project => {
        this.currentProject = project;
      });

    // Subscribe to playback state
    this.videoEditorService.getPlaybackState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.playbackState = state;
      });

    // Subscribe to timeline state
    this.videoEditorService.getTimelineState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.timelineState = state;
      });

    // Show welcome message
    this.snackBar.open('Welcome to Professional Video Editor!', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Prevent shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.togglePlayback();
        break;
      case 'KeyJ':
        event.preventDefault();
        this.previousFrame();
        break;
      case 'KeyK':
        event.preventDefault();
        this.togglePlayback();
        break;
      case 'KeyL':
        event.preventDefault();
        this.nextFrame();
        break;
      case 'Home':
        event.preventDefault();
        this.videoEditorService.seek(0);
        break;
      case 'End':
        event.preventDefault();
        if (this.currentProject) {
          this.videoEditorService.seek(this.currentProject.duration);
        }
        break;
      case 'KeyS':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.saveProject();
        }
        break;
      case 'KeyN':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.newProject();
        }
        break;
      case 'KeyE':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.exportProject();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.timelineState?.selectedClips.length) {
          event.preventDefault();
          this.deleteSelectedClips();
        }
        break;
    }
  }

  // Playback Controls
  togglePlayback(): void {
    if (this.playbackState?.isPlaying) {
      this.videoEditorService.pause();
    } else {
      this.videoEditorService.play();
    }
  }

  stop(): void {
    this.videoEditorService.stop();
  }

  previousFrame(): void {
    const frameTime = 1 / (this.currentProject?.fps || 30);
    const newTime = Math.max(0, (this.playbackState?.currentTime || 0) - frameTime);
    this.videoEditorService.seek(newTime);
  }

  nextFrame(): void {
    const frameTime = 1 / (this.currentProject?.fps || 30);
    const maxTime = this.currentProject?.duration || 0;
    const newTime = Math.min(maxTime, (this.playbackState?.currentTime || 0) + frameTime);
    this.videoEditorService.seek(newTime);
  }

  // Project Management
  newProject(): void {
    const projectName = prompt('Enter project name:', 'New Project');
    if (projectName) {
      this.videoEditorService.createNewProject(projectName);
      this.snackBar.open(`Created new project: ${projectName}`, 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  openProject(): void {
    // Implement project opening logic
    this.snackBar.open('Open project functionality coming soon!', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  saveProject(): void {
    if (this.currentProject) {
      // Implement project saving logic
      this.snackBar.open(`Saved project: ${this.currentProject.name}`, 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  saveProjectAs(): void {
    if (this.currentProject) {
      const newName = prompt('Enter new project name:', this.currentProject.name);
      if (newName) {
        this.videoEditorService.updateProject({ name: newName });
        this.snackBar.open(`Saved project as: ${newName}`, 'Close', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    }
  }

  exportProject(): void {
    if (!this.currentProject) {
      this.snackBar.open('No project to export', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    // Show export dialog or start export process
    this.snackBar.open('Starting export...', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });

    // Simulate export process
    setTimeout(() => {
      this.snackBar.open('Export completed!', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }, 3000);
  }

  // Clip Management
  deleteSelectedClips(): void {
    if (this.timelineState?.selectedClips.length) {
      const count = this.timelineState.selectedClips.length;
      
      // Delete each selected clip
      this.timelineState.selectedClips.forEach(clipId => {
        this.videoEditorService.removeClip(clipId);
      });
      
      this.videoEditorService.clearSelection();
      
      this.snackBar.open(`Deleted ${count} clip(s)`, 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  // Utility Methods
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * (this.currentProject?.fps || 30));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }
}