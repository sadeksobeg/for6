import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { VideoEditorService } from '../../core/services/video-editor.service';
import { FFmpegService } from '../../core/services/ffmpeg.service';
import { VideoProject, PlaybackState, TimelineState } from '../../core/models/video-editor.models';
import { ExportDialogComponent } from './components/export-dialog/export-dialog.component';

@Component({
  selector: 'app-video-studio',
  templateUrl: './video-studio.component.html',
  styleUrls: ['./video-studio.component.scss']
})
export class VideoStudioComponent implements OnInit, OnDestroy {
  currentProject: VideoProject | null = null;
  playbackState: PlaybackState | null = null;
  timelineState: TimelineState | null = null;
  ffmpegLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private videoEditorService: VideoEditorService,
    private ffmpegService: FFmpegService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Subscribe to project state
    combineLatest([
      this.videoEditorService.getCurrentProject(),
      this.videoEditorService.getPlaybackState(),
      this.videoEditorService.getTimelineState()
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([project, playbackState, timelineState]) => {
        this.currentProject = project;
        this.playbackState = playbackState;
        this.timelineState = timelineState;
      });

    // Subscribe to FFmpeg loading state
    this.ffmpegService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.ffmpegLoading = loading;
      });

    // Initialize FFmpeg
    this.initializeFFmpeg();

    // Show welcome message
    this.snackBar.open('Professional Video Studio loaded!', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeFFmpeg(): Promise<void> {
    try {
      await this.ffmpegService.load();
      this.snackBar.open('Video processing engine ready!', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Failed to initialize FFmpeg:', error);
      this.snackBar.open('Warning: Video processing engine failed to load', 'Close', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
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
          this.openExportDialog();
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

  openExportDialog(): void {
    if (!this.currentProject) {
      this.snackBar.open('No project to export', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    const dialogRef = this.dialog.open(ExportDialogComponent, {
      width: '600px',
      data: { project: this.currentProject }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.exportProject(result);
      }
    });
  }

  private async exportProject(settings: any): Promise<void> {
    try {
      this.snackBar.open('Starting export...', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });

      const blob = await this.videoEditorService.exportProject(settings);
      
      // Download the exported video
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentProject?.name || 'export'}.${settings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.snackBar.open('Export completed!', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } catch (error) {
      console.error('Export failed:', error);
      this.snackBar.open('Export failed. Please try again.', 'Close', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
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