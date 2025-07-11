import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MediaService, CreateUpdateMediaDto } from '@proxy/medias';
import { ProjectService, ProjectDto } from '@proxy/projects';

@Component({
  selector: 'app-create-media',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-media.component.html',
  styleUrl: './create-media.component.scss'
})
export class CreateMediaComponent implements OnInit {
  media: CreateUpdateMediaDto = {
    title: '',
    description: '',
    video: '',
    metaData: '',
    projectId: '',
    sourceLanguage: '',
    destinationLanguage: '',
    countryDialect: ''
  };

  projects: ProjectDto[] = [];
  isLoadingProjects: boolean = false;
  
  // Video upload properties
  selectedVideoFile: File | null = null;
  uploadedVideoUrl: string = '';
  isUploading: boolean = false;
  uploadProgress: number = 0;
  isDragOver: boolean = false;

  constructor(
    private mediasService: MediaService, 
    private projectService: ProjectService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoadingProjects = true;
    this.projectService.getList({
      maxResultCount: 100,
      skipCount: 0,
      sorting: 'title'
    }).subscribe({
      next: (response) => {
        this.projects = response.items || [];
        this.isLoadingProjects = false;
        
        // Auto-select first project if available
        if (this.projects.length > 0 && !this.media.projectId) {
          this.media.projectId = this.projects[0].id;
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoadingProjects = false;
        this.showMessage('Failed to load projects. Please try again.', 'error');
      }
    });
  }

  // Video upload methods
  onVideoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleVideoFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      this.handleVideoFile(files[0]);
    }
  }

  handleVideoFile(file: File): void {
    // Validate file type
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      this.showMessage('Please select a valid video or audio file.', 'error');
      return;
    }

    // Validate file size (500MB limit)
    const maxSize = 1000 * 1024 * 1024; // 1GB in bytes
    if (file.size > maxSize) {
      this.showMessage('File size must be less than 1GB.', 'error');
      return;
    }

    this.selectedVideoFile = file;
    
    // Auto-fill title if empty
    if (!this.media.title) {
      this.media.title = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
    }

    // Create preview URL for media file
    this.uploadedVideoUrl = URL.createObjectURL(file);
    
    this.showMessage('Media file selected successfully!', 'success');
  }

  removeVideo(): void {
    this.selectedVideoFile = null;
    if (this.uploadedVideoUrl) {
      URL.revokeObjectURL(this.uploadedVideoUrl);
      this.uploadedVideoUrl = '';
    }
    this.uploadProgress = 0;
    this.showMessage('Video removed.', 'info');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async submit(): Promise<void> {
    if (!this.media.projectId) {
      this.showMessage('Please select a project', 'error');
      return;
    }

    if (!this.media.title.trim()) {
      this.showMessage('Please enter a title', 'error');
      return;
    }

    if (!this.selectedVideoFile) {
      this.showMessage('Please select a video file', 'error');
      return;
    }

    try {
      this.isUploading = true;
      this.uploadProgress = 10;

      // First upload the video file to get a URL
      const formData = new FormData();
      formData.append('video', this.selectedVideoFile, this.selectedVideoFile.name);
      
      this.uploadProgress = 30;

      // Create a temporary URL for the video
      const videoUrl = URL.createObjectURL(this.selectedVideoFile);
      this.media.video = videoUrl;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 200);

      try {
        // Create the media record with video URL
        const createdMedia = await this.mediasService.create(this.media).toPromise();
        
        if (createdMedia) {
          // Try to upload the actual file
          try {
            await this.mediasService.uploadVideo(createdMedia.id, formData).toPromise();
            clearInterval(progressInterval);
            this.uploadProgress = 100;
            
            setTimeout(() => {
              this.showMessage('Media created and video uploaded successfully!', 'success');
              this.router.navigate(['/media']);
            }, 500);
          } catch (uploadError) {
            clearInterval(progressInterval);
            console.error('Error uploading video file:', uploadError);
            // Still proceed since we have the media record
            this.uploadProgress = 100;
            setTimeout(() => {
              this.showMessage('Media created successfully! Video file upload may have failed but media is accessible.', 'warning');
              this.router.navigate(['/media']);
            }, 500);
          }
        }
      } catch (createError) {
        clearInterval(progressInterval);
        console.error('Error creating media:', createError);
        this.isUploading = false;
        this.uploadProgress = 0;
        this.showMessage('Failed to create media. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating media:', error);
      this.isUploading = false;
      this.uploadProgress = 0;
      this.showMessage('Failed to create media. Please try again.', 'error');
    }
  }

  onProjectChange(): void {
    const selectedProject = this.projects.find(p => p.id === this.media.projectId);
    if (selectedProject) {
      console.log('Selected project:', selectedProject.title);
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    // Create a toast notification
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