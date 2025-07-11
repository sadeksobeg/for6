import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService, MediaDto, CreateUpdateMediaDto } from '@proxy/medias';
import { ProjectService, ProjectDto } from '@proxy/projects';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-media',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-media.component.html',
  styleUrl: './edit-media.component.scss'
})
export class EditMediaComponent implements OnInit {
  mediaId!: string;
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
  isLoadingMedia: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediasService: MediaService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.mediaId = this.route.snapshot.paramMap.get('id')!;
    this.loadProjects();
    this.loadMedia();
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
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoadingProjects = false;
        alert('Failed to load projects. Please try again.');
      }
    });
  }

  loadMedia(): void {
    this.isLoadingMedia = true;
    this.mediasService.get(this.mediaId).subscribe({
      next: (data: MediaDto) => {
        this.media = {
          title: data.title || '',
          description: data.description || '',
          video: data.video || '',
          metaData: data.metaData || '',
          projectId: data.projectId || '',
          sourceLanguage: data.sourceLanguage || '',
          destinationLanguage: data.destinationLanguage || '',
          countryDialect: data.countryDialect || ''
        };
        this.isLoadingMedia = false;
      },
      error: (error) => {
        console.error('Error loading media:', error);
        this.isLoadingMedia = false;
        alert('Failed to load media. Please try again.');
      }
    });
  }

  update(): void {
    if (!this.media.projectId) {
      alert('Please select a project');
      return;
    }

    if (!this.media.title.trim()) {
      alert('Please enter a title');
      return;
    }

    this.mediasService.update(this.mediaId, this.media).subscribe({
      next: () => {
        this.router.navigate(['/media']);
      },
      error: (error) => {
        console.error('Error updating media:', error);
        alert('Failed to update media. Please try again.');
      }
    });
  }

  onProjectChange(): void {
    const selectedProject = this.projects.find(p => p.id === this.media.projectId);
    if (selectedProject) {
      console.log('Selected project:', selectedProject.title);
    }
  }
}