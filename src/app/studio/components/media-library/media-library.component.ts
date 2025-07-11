import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoEditorService } from '../../services/video-editor.service';
import { MediaAsset, MediaType } from '../../models/video-editor.models';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [CommonModule, MaterialModule, DragDropModule],
  template: `
    <div class="media-library">
      <div class="library-header">
        <h3>Media Library</h3>
        <div class="library-actions">
          <input 
            type="file" 
            #fileInput 
            style="display: none;" 
            multiple
            accept="video/*,audio/*,image/*"
            (change)="onFilesSelected($event)"
          />
          <button mat-raised-button color="primary" (click)="fileInput.click()">
            <mat-icon>add</mat-icon>
            Import Media
          </button>
          <button mat-icon-button (click)="refreshLibrary()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <div class="library-content">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading media...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading && mediaAssets.length === 0" class="empty-state">
          <mat-icon class="empty-icon">perm_media</mat-icon>
          <h4>No Media Files</h4>
          <p>Import video, audio, or image files to get started</p>
          <button mat-raised-button color="primary" (click)="fileInput.click()">
            <mat-icon>add</mat-icon>
            Import Your First File
          </button>
        </div>

        <!-- Media Grid -->
        <div *ngIf="!isLoading && mediaAssets.length > 0" class="media-grid">
          <div 
            class="media-item"
            *ngFor="let asset of mediaAssets; trackBy: trackByAssetId"
            [class.selected]="selectedAsset?.id === asset.id"
            (click)="selectAsset(asset)"
            (dblclick)="previewAsset(asset)"
            cdkDrag
            [cdkDragData]="asset"
          >
            <!-- Media Thumbnail -->
            <div class="media-thumbnail">
              <img 
                *ngIf="asset.thumbnail" 
                [src]="asset.thumbnail" 
                [alt]="asset.name"
                (error)="onThumbnailError($event, asset)"
              />
              <div *ngIf="!asset.thumbnail" class="media-placeholder">
                <mat-icon [class]="getMediaIcon(asset.type)">{{ getMediaIconName(asset.type) }}</mat-icon>
              </div>
              <div class="media-overlay">
                <div class="media-type">{{ asset.type.toUpperCase() }}</div>
                <div class="media-duration" *ngIf="asset.duration">
                  {{ formatDuration(asset.duration) }}
                </div>
              </div>
            </div>
            
            <!-- Media Info -->
            <div class="media-info">
              <div class="media-name" [title]="asset.name">{{ asset.name }}</div>
              <div class="media-details">
                <span class="duration">{{ formatDuration(asset.duration) }}</span>
                <span *ngIf="asset.resolution" class="resolution">
                  {{ asset.resolution.width }}x{{ asset.resolution.height }}
                </span>
                <span class="file-size">{{ formatFileSize(asset.fileSize) }}</span>
              </div>
            </div>
            
            <!-- Media Actions -->
            <div class="media-actions">
              <button 
                mat-icon-button 
                class="action-btn preview" 
                (click)="previewAsset(asset); $event.stopPropagation()"
                matTooltip="Preview"
              >
                <mat-icon>play_arrow</mat-icon>
              </button>
              <button 
                mat-icon-button 
                class="action-btn info" 
                (click)="showAssetInfo(asset); $event.stopPropagation()"
                matTooltip="Properties"
              >
                <mat-icon>info</mat-icon>
              </button>
              <button 
                mat-icon-button 
                class="action-btn remove" 
                (click)="removeAsset(asset); $event.stopPropagation()"
                matTooltip="Remove"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Progress -->
      <div class="import-progress" *ngIf="isImporting">
        <mat-progress-bar [value]="importProgress"></mat-progress-bar>
        <div class="progress-text">
          Importing {{ currentImportFile }}... {{ importProgress }}%
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./media-library.component.scss']
})
export class MediaLibraryComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  mediaAssets: MediaAsset[] = [];
  selectedAsset: MediaAsset | null = null;
  isLoading = false;
  isImporting = false;
  importProgress = 0;
  currentImportFile = '';

  private destroy$ = new Subject<void>();

  constructor(
    private videoEditorService: VideoEditorService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.videoEditorService.getMediaAssets()
      .pipe(takeUntil(this.destroy$))
      .subscribe(assets => {
        this.mediaAssets = assets;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      this.importFiles(Array.from(files));
    }
    
    // Reset input
    input.value = '';
  }

  private async importFiles(files: File[]): Promise<void> {
    this.isImporting = true;
    this.importProgress = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.currentImportFile = file.name;
      
      try {
        await this.videoEditorService.addMediaAsset(file);
        this.importProgress = Math.round(((i + 1) / files.length) * 100);
        
        this.snackBar.open(`Imported ${file.name}`, 'Close', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
        this.snackBar.open(`Failed to import ${file.name}`, 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    }
    
    this.isImporting = false;
    this.importProgress = 0;
    this.currentImportFile = '';
  }

  selectAsset(asset: MediaAsset): void {
    this.selectedAsset = this.selectedAsset?.id === asset.id ? null : asset;
  }

  previewAsset(asset: MediaAsset): void {
    // Implement preview functionality
    console.log('Preview asset:', asset);
    this.snackBar.open(`Previewing ${asset.name}`, 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  showAssetInfo(asset: MediaAsset): void {
    // Show asset properties dialog
    const info = [
      `Name: ${asset.name}`,
      `Type: ${asset.type}`,
      `Duration: ${this.formatDuration(asset.duration)}`,
      `File Size: ${this.formatFileSize(asset.fileSize)}`,
      `Format: ${asset.format}`
    ];
    
    if (asset.resolution) {
      info.push(`Resolution: ${asset.resolution.width}x${asset.resolution.height}`);
    }
    
    alert(info.join('\n'));
  }

  removeAsset(asset: MediaAsset): void {
    if (confirm(`Remove "${asset.name}" from library?`)) {
      this.videoEditorService.removeMediaAsset(asset.id);
      if (this.selectedAsset?.id === asset.id) {
        this.selectedAsset = null;
      }
      
      this.snackBar.open(`Removed ${asset.name}`, 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  refreshLibrary(): void {
    this.isLoading = true;
    // Simulate refresh
    setTimeout(() => {
      this.isLoading = false;
      this.snackBar.open('Library refreshed', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }, 1000);
  }

  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getMediaIcon(type: MediaType): string {
    switch (type) {
      case MediaType.VIDEO: return 'video-icon';
      case MediaType.AUDIO: return 'audio-icon';
      case MediaType.IMAGE: return 'image-icon';
      default: return 'file-icon';
    }
  }

  getMediaIconName(type: MediaType): string {
    switch (type) {
      case MediaType.VIDEO: return 'movie';
      case MediaType.AUDIO: return 'audiotrack';
      case MediaType.IMAGE: return 'image';
      default: return 'insert_drive_file';
    }
  }

  onThumbnailError(event: Event, asset: MediaAsset): void {
    console.warn(`Thumbnail failed to load for ${asset.name}`);
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  trackByAssetId(index: number, asset: MediaAsset): string {
    return asset.id;
  }
}