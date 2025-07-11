import { Component, OnInit } from '@angular/core';
import { PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { MediaDto, MediaService } from '@proxy/medias';
import { ProjectDto, ProjectService } from '@proxy/projects';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-list-medias',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './list-medias.component.html',
  styleUrls: ['./list-medias.component.scss']
})
export class ListMediasComponent implements OnInit {
  media: MediaDto[] = [];
  filteredVideos: MediaDto[] = [];
  projects: ProjectDto[] = [];
  selectedMedia: MediaDto | null = null;
  
  // Search and filter
  searchQuery: string = '';
  selectedLanguageFilter: string = '';
  selectedProjectFilter: string = '';
  
  // Loading states
  isLoading: boolean = false;
  isLoadingMore: boolean = false;
  isVideoLoading: boolean = false;
  
  // Modal states
  showVideoModal: boolean = false;
  
  // Video player states
  videoError: boolean = false;
  videoErrorMessage: string = '';
  videoUrl: string = '';
  
  // Pagination
  hasMoreItems: boolean = true;
  
  // Video metadata
  videoMetadata = {
    duration: 0,
    resolution: ''
  };
  
  input: PagedAndSortedResultRequestDto = {
    maxResultCount: 12,
    skipCount: 0,
    sorting: 'creationTime desc'
  };

  // Language mapping for better display
  private languageMap: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };

  constructor(
    private mediasService: MediaService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMedia();
    this.loadProjects();
  }

  loadMedia(): void {
    this.isLoading = true;
    this.mediasService.getList(this.input).subscribe({
      next: response => {
        this.isLoading = false;
        console.log('Media List API Response:', response);
        if (response && response.items) {
          this.media = response.items;
          this.applyFilters();
          this.hasMoreItems = response.items.length === this.input.maxResultCount;
          console.log('Loaded media items:', this.media.length);
        } else {
          console.log('No items in the media list response');
          this.hasMoreItems = false;
        }
      },
      error: error => {
        this.isLoading = false;
        console.error('Error fetching media list:', error);
        this.showMessage('Failed to load media list', 'error');
        this.hasMoreItems = false;
      }
    });
  }

  loadProjects(): void {
    this.projectService.getList({
      maxResultCount: 100,
      skipCount: 0,
      sorting: 'title'
    }).subscribe({
      next: (response) => {
        this.projects = response.items || [];
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasMoreItems) return;
    
    this.isLoadingMore = true;
    this.input.skipCount += this.input.maxResultCount;
    
    this.mediasService.getList(this.input).subscribe({
      next: response => {
        this.isLoadingMore = false;
        console.log('Load More Media API Response:', response);
        if (response && response.items) {
          this.media = [...this.media, ...response.items];
          this.applyFilters();
          this.hasMoreItems = response.items.length === this.input.maxResultCount;
        } else {
          this.hasMoreItems = false;
        }
      },
      error: error => {
        this.isLoadingMore = false;
        console.error('Error loading more media:', error);
        this.showMessage('Failed to load more media', 'error');
      }
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.media];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(media =>
        media.title?.toLowerCase().includes(query) ||
        media.description?.toLowerCase().includes(query)
      );
    }

    // Apply language filter
    if (this.selectedLanguageFilter) {
      filtered = filtered.filter(media =>
        media.sourceLanguage === this.selectedLanguageFilter ||
        media.destinationLanguage === this.selectedLanguageFilter
      );
    }

    // Apply project filter
    if (this.selectedProjectFilter) {
      filtered = filtered.filter(media =>
        media.projectId === this.selectedProjectFilter
      );
    }

    this.filteredVideos = filtered;
  }

  refreshMediaList(): void {
    this.input.skipCount = 0;
    this.media = [];
    this.filteredVideos = [];
    this.loadMedia();
    this.showMessage('Media list refreshed', 'success');
  }

  navigateToCreateMedia(): void {
    this.router.navigate(['/media/create']);
  }

  viewMedia(media: MediaDto): void {
    console.log('Viewing media:', media);
    this.selectedMedia = media;
    this.showVideoModal = true;
    this.resetVideoMetadata();
    this.resetVideoState();
    
    // Try to load video
    this.loadVideoFromBackend(media.id);
  }

  private loadVideoFromBackend(mediaId: string): void {
    this.isVideoLoading = true;
    this.videoError = false;
    
    // Use direct video URL if available
    if (this.selectedMedia?.video && this.selectedMedia.video.trim() !== '') {
      console.log('Loading video from URL:', this.selectedMedia.video);
      this.videoUrl = this.selectedMedia.video;
      this.isVideoLoading = false;
      
      // Force video element to reload with new URL
      setTimeout(() => {
        const videoElement = document.querySelector('.modal-video-player') as HTMLVideoElement;
        if (videoElement) {
          videoElement.src = this.videoUrl;
          videoElement.load();
        }
      }, 100);
    } else {
      // Try to get video via download endpoint as fallback
      this.mediasService.downloadVideo(mediaId).subscribe({
        next: (videoBlob: Blob) => {
          console.log('Video downloaded successfully:', videoBlob);
          
          // Create a blob URL for the video
          this.videoUrl = URL.createObjectURL(videoBlob);
          this.isVideoLoading = false;
          
          // Force video element to reload with new URL
          setTimeout(() => {
            const videoElement = document.querySelector('.modal-video-player') as HTMLVideoElement;
            if (videoElement) {
              videoElement.src = this.videoUrl;
              videoElement.load();
            }
          }, 100);
        },
        error: (error) => {
          console.error('Failed to download video:', error);
          this.isVideoLoading = false;
          this.videoError = true;
          this.videoErrorMessage = 'No video available for this media item';
          this.showMessage('Failed to load video: No video source available', 'error');
        }
      });
    }
  }

  downloadVideo(media?: MediaDto): void {
    const targetMedia = media || this.selectedMedia;
    if (!targetMedia) return;
    
    this.showMessage('Starting download...', 'info');
    
    // Try direct download first
    if (targetMedia.video && targetMedia.video.trim() !== '') {
      // Create download link for direct URL
      const link = document.createElement('a');
      link.href = targetMedia.video;
      link.download = `${targetMedia.title || 'video'}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showMessage('Video download started!', 'success');
    } else {
      // Fallback to download endpoint
      this.mediasService.downloadVideo(targetMedia.id).subscribe({
        next: (videoBlob: Blob) => {
          // Create download link
          const url = URL.createObjectURL(videoBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${targetMedia.title || 'video'}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          this.showMessage('Video downloaded successfully!', 'success');
        },
        error: (error) => {
          console.error('Download failed:', error);
          this.showMessage('Failed to download video', 'error');
        }
      });
    }
  }

  editMedia(media: MediaDto): void {
    this.router.navigate(['/media/edit', media.id]);
  }

  editSelectedMedia(): void {
    if (this.selectedMedia) {
      this.router.navigate(['/media/edit', this.selectedMedia.id]);
      this.closeVideoModal();
    }
  }

  deleteMedia(mediaId: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.mediasService.delete(mediaId).subscribe({
          next: () => {
            this.media = this.media.filter(m => m.id !== mediaId);
            this.applyFilters();
            Swal.fire('Deleted!', 'The media has been deleted.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', 'Something went wrong while deleting.', 'error');
            console.error('Delete failed:', err);
          }
        });
      }
    });
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
    this.selectedMedia = null;
    
    // Clean up blob URL to prevent memory leaks
    if (this.videoUrl && this.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoUrl);
    }
    this.videoUrl = '';
    
    this.resetVideoMetadata();
    this.resetVideoState();
  }

  // Video event handlers
  onVideoLoadStart(): void {
    this.isVideoLoading = true;
    this.videoError = false;
    this.videoErrorMessage = '';
  }

  onVideoCanPlay(): void {
    this.isVideoLoading = false;
  }

  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.isVideoLoading = false;
    this.videoMetadata.duration = video.duration;
    this.videoMetadata.resolution = `${video.videoWidth}x${video.videoHeight}`;
    console.log('Video loaded successfully:', {
      duration: video.duration,
      resolution: `${video.videoWidth}x${video.videoHeight}`,
      src: video.src
    });
  }

  onVideoError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.isVideoLoading = false;
    this.videoError = true;
    
    // Get more specific error information
    const error = video.error;
    let errorMessage = 'Unknown error occurred';
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred while loading video';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Video format not supported or corrupted';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video source not supported or not found';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }
    
    this.videoErrorMessage = errorMessage;
    console.error('Video loading error:', {
      error: error,
      message: errorMessage,
      src: video.src,
      selectedMedia: this.selectedMedia
    });
    this.showMessage(`Failed to load video: ${errorMessage}`, 'error');
  }

  onVideoThumbnailError(event: Event, media: MediaDto): void {
    console.error('Video thumbnail failed to load:', media.title, media.video);
    const videoElement = event.target as HTMLVideoElement;
    videoElement.style.display = 'none';
  }

  onThumbnailLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    // Set video to first frame for thumbnail
    video.currentTime = 1;
  }

  testWithSampleVideo(): void {
    if (this.selectedMedia) {
      // Use a working sample video URL
      this.videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      this.resetVideoState();
      this.showMessage('Testing with sample video...', 'info');
      
      // Force video element to reload
      setTimeout(() => {
        const videoElement = document.querySelector('.modal-video-player') as HTMLVideoElement;
        if (videoElement) {
          videoElement.src = this.videoUrl;
          videoElement.load();
        }
      }, 100);
    }
  }

  // Utility methods
  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getLanguageName(languageCode?: string): string {
    if (!languageCode) return 'Not specified';
    return this.languageMap[languageCode] || languageCode;
  }

  getUrlType(url?: string): string {
    if (!url) return 'Empty/Null';
    if (url.startsWith('http://') || url.startsWith('https://')) return 'HTTP URL';
    if (url.startsWith('blob:')) return 'Blob URL';
    if (url.startsWith('data:')) return 'Data URL';
    if (url.startsWith('/')) return 'Absolute Path';
    if (url.includes('://')) return 'Other Protocol';
    return 'Relative Path';
  }

  trackByMediaId(index: number, media: MediaDto): string {
    return media.id;
  }

  private resetVideoMetadata(): void {
    this.videoMetadata = {
      duration: 0,
      resolution: ''
    };
  }

  private resetVideoState(): void {
    this.isVideoLoading = false;
    this.videoError = false;
    this.videoErrorMessage = '';
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease;
      max-width: 300px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }
}