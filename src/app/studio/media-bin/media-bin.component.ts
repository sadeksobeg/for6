import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../proxy/medias/media.service';
import { MediaDto, CreateUpdateMediaDto } from '../../proxy/medias/models';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel

@Component({
  selector: 'app-media-bin',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule here
  templateUrl: './media-bin.component.html',
  styleUrl: './media-bin.component.scss'
})
export class MediaBinComponent implements OnInit {
  @Input() mediaItems: MediaDto[] = [];
  @Input() currentProjectId: string;

  @Output() mediaSelected = new EventEmitter<MediaDto>();
  @Output() mediaDeleted = new EventEmitter<string>();
  @Output() mediaEdited = new EventEmitter<MediaDto>();
  @Output() mediaUploaded = new EventEmitter<MediaDto>();

  constructor(private mediaService: MediaService) { }

  ngOnInit(): void {
    // Initial load or any setup if needed
  }

  onMediaClick(media: MediaDto): void {
    this.mediaSelected.emit(media);
    console.log('Media selected:', media.title);
  }

  refreshMediaList(): void {
    if (this.currentProjectId) {
      this.mediaService.getProjectMedias(this.currentProjectId).subscribe({
        next: (medias: MediaDto[]) => {
          this.mediaItems = medias;
          console.log('Media list refreshed');
        },
        error: (error) => {
          console.error('Failed to refresh media list:', error);
        }
      });
    }
  }

  deleteMedia(mediaId: string): void {
    if (confirm('Are you sure you want to delete this media?')) {
      this.mediaService.delete(mediaId).subscribe({
        next: () => {
          console.log(`Media with ID ${mediaId} deleted successfully.`);
          this.mediaItems = this.mediaItems.filter(m => m.id !== mediaId);
          this.mediaDeleted.emit(mediaId);
        },
        error: (error) => {
          console.error(`Failed to delete media with ID ${mediaId}:`, error);
          alert('Failed to delete media.');
        }
      });
    }
  }

  editMedia(media: MediaDto): void {
    const newTitle = prompt('Enter new title for media:', media.title);
    if (newTitle !== null && newTitle !== media.title) {
      const updateDto: CreateUpdateMediaDto = {
        title: newTitle,
        description: media.description,
        video: media.video,
        metaData: media.metaData,
        projectId: media.projectId,
        sourceLanguage: media.sourceLanguage,
        destinationLanguage: media.destinationLanguage,
        countryDialect: media.countryDialect
      };

      this.mediaService.update(media.id, updateDto).subscribe({
        next: (updatedMedia) => {
          console.log('Media updated successfully:', updatedMedia);
          const index = this.mediaItems.findIndex(m => m.id === updatedMedia.id);
          if (index !== -1) {
            this.mediaItems[index] = updatedMedia;
          }
          this.mediaEdited.emit(updatedMedia);
        },
        error: (error) => {
          console.error('Failed to update media:', error);
          alert('Failed to update media.');
        }
      });
    }
  }

  handleMediaUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      console.log('Attempting to upload file:', file.name);
      const createMediaDto: CreateUpdateMediaDto = {
        title: file.name,
        description: '',
        video: '',
        metaData: JSON.stringify({ fileSize: file.size }),
        projectId: this.currentProjectId,
        sourceLanguage: 'en',
        destinationLanguage: 'en',
        countryDialect: ''
      };

      this.mediaService.create(createMediaDto).subscribe({
        next: (mediaDto: MediaDto) => {
          console.log('Media metadata created:', mediaDto);
          const mediaId = mediaDto.id;
          const formData = new FormData();
          formData.append('video', file, file.name); // 'video' should match the parameter name on the backend

          this.mediaService.uploadVideo(mediaId, formData).subscribe({
            next: (uploadResponse) => {
              console.log('File uploaded successfully:', uploadResponse);
              alert(`File "${file.name}" uploaded and linked to media ID: ${mediaId}`);
              this.mediaItems.push(mediaDto); // Add the new media to the list
              this.mediaUploaded.emit(mediaDto);
            },
            error: (uploadError) => {
              console.error('File upload failed:', uploadError);
              alert(`Failed to upload file "${file.name}".`);
            }
          });
        },
        error: (metadataError) => {
          console.error('Failed to create media metadata:', metadataError);
          alert(`Failed to prepare upload for "${file.name}".`);
        }
      });
    }
  }

  trackByMediaId(index: number, media: MediaDto): string {
    return media.id;
  }
}
