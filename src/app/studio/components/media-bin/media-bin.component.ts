import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { StudioMediaService } from '../../services/media.service';
import { Resource } from '../../models/studio.models';

@Component({
  selector: 'app-media-bin',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="media-bin">
      <div class="media-bin-header">
        <h3>Project Media</h3>
        <div class="media-bin-controls">
          <input 
            type="file" 
            #fileInput 
            style="display: none;" 
            multiple
            accept="video/*,audio/*,image/*"
            (change)="onFilesSelected($event)"
          />
          <button class="btn btn-primary" (click)="fileInput.click()">
            <i class="icon-import"></i>
            Import Media
          </button>
          <button class="btn btn-secondary" (click)="clearAll()">
            <i class="icon-trash"></i>
            Clear All
          </button>
        </div>
      </div>

      <div class="media-bin-content">
        <div class="media-grid" *ngIf="resources.length > 0; else emptyState">
          <div 
            class="media-item"
            *ngFor="let resource of resources; trackBy: trackByResourceId"
            [class.selected]="selectedResource?.id === resource.id"
            (click)="selectResource(resource)"
            (dblclick)="previewResource(resource)"
            cdkDrag
            [cdkDragData]="{ resource: resource }"
          >
            <div class="media-thumbnail">
              <img 
                *ngIf="resource.thumbnail" 
                [src]="resource.thumbnail" 
                [alt]="resource.name"
                (error)="onThumbnailError($event, resource)"
              />
              <div *ngIf="!resource.thumbnail" class="media-placeholder">
                <i [class]="getMediaIcon(resource.type)"></i>
              </div>
              <div class="media-overlay">
                <div class="media-type">{{ resource.type.toUpperCase() }}</div>
                <div class="media-duration">{{ formatDuration(resource.duration) }}</div>
              </div>
            </div>
            
            <div class="media-info">
              <div class="media-name" [title]="resource.name">{{ resource.name }}</div>
              <div class="media-details">
                <span class="duration">{{ formatDuration(resource.duration) }}</span>
                <span *ngIf="resource.width && resource.height" class="resolution">
                  {{ resource.width }}x{{ resource.height }}
                </span>
              </div>
            </div>
            
            <div class="media-actions">
              <button 
                class="action-btn preview" 
                (click)="previewResource(resource); $event.stopPropagation()"
                title="Preview"
              >
                <i class="icon-play"></i>
              </button>
              <button 
                class="action-btn remove" 
                (click)="removeResource(resource); $event.stopPropagation()"
                title="Remove"
              >
                <i class="icon-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <div class="empty-icon">
              <i class="icon-media"></i>
            </div>
            <h4>No Media Files</h4>
            <p>Import video, audio, or image files to get started</p>
            <button class="btn btn-primary" (click)="fileInput.click()">
              <i class="icon-import"></i>
              Import Your First File
            </button>
          </div>
        </ng-template>
      </div>

      <!-- Import Progress -->
      <div class="import-progress" *ngIf="isImporting">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="importProgress"></div>
        </div>
        <div class="progress-text">
          Importing {{ currentImportFile }}... {{ importProgress }}%
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./media-bin.component.scss']
})
export class MediaBinComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  resources: Resource[] = [];
  selectedResource: Resource | null = null;
  isImporting = false;
  importProgress = 0;
  currentImportFile = '';

  private destroy$ = new Subject<void>();

  constructor(private mediaService: StudioMediaService) {}

  ngOnInit(): void {
    this.mediaService.resources$
      .pipe(takeUntil(this.destroy$))
      .subscribe(resources => {
        this.resources = resources;
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
        await this.mediaService.addResource(file);
        this.importProgress = Math.round(((i + 1) / files.length) * 100);
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
        // Continue with next file
      }
    }
    
    this.isImporting = false;
    this.importProgress = 0;
    this.currentImportFile = '';
  }

  selectResource(resource: Resource): void {
    this.selectedResource = this.selectedResource?.id === resource.id ? null : resource;
  }

  previewResource(resource: Resource): void {
    // Emit event to parent component to show in preview
    console.log('Preview resource:', resource);
    // This would typically emit an event or call a service method
  }

  removeResource(resource: Resource): void {
    if (confirm(`Remove "${resource.name}" from project?`)) {
      this.mediaService.removeResource(resource.id);
      if (this.selectedResource?.id === resource.id) {
        this.selectedResource = null;
      }
    }
  }

  clearAll(): void {
    if (this.resources.length === 0) return;
    
    if (confirm('Remove all media files from project? This cannot be undone.')) {
      this.resources.forEach(resource => {
        this.mediaService.removeResource(resource.id);
      });
      this.selectedResource = null;
    }
  }

  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getMediaIcon(type: string): string {
    switch (type) {
      case 'video': return 'icon-video';
      case 'audio': return 'icon-audio';
      case 'image': return 'icon-image';
      default: return 'icon-file';
    }
  }

  onThumbnailError(event: Event, resource: Resource): void {
    console.warn(`Thumbnail failed to load for ${resource.name}`);
    // Hide the img element and show placeholder
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  trackByResourceId(index: number, resource: Resource): string {
    return resource.id;
  }
}