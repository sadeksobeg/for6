import { Component, OnInit } from '@angular/core';
import { PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { ProjectDto, ProjectService } from '@proxy/projects';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-list-project',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-project.component.html',
  styleUrls: ['./list-project.component.scss']
})
export class ListProjectComponent implements OnInit {
  projects: ProjectDto[] = [];
  input: PagedAndSortedResultRequestDto = {
    maxResultCount: 10,
    skipCount: 0,
    sorting: ''
  };

  constructor(
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getList(this.input).subscribe(
      response => {
        console.log('API Response:', response);
        if (response && response.items) {
          this.projects = response.items;
        } else {
          console.log('No items in the response');
        }
      },
      error => {
        console.error('Error fetching projects:', error);
      }
    );
  }

  loadMore(): void {
    this.input.skipCount += this.input.maxResultCount;
    this.projectService.getList(this.input).subscribe(response => {
      this.projects = [...this.projects, ...response.items];
    });
  }

  createProject(): void {
    // Navigate to the create project page
    this.router.navigateByUrl('/projects/create');
  }
  navigateToEdit(id: string): void {
    this.router.navigate(['/projects/edit', id]);
  }

  viewProject(project: ProjectDto): void {
    const details = `
      Title: ${project.title}
      Description: ${project.description || 'No description'}
      Created: ${project.creationTime ? new Date(project.creationTime).toLocaleDateString() : 'Unknown'}
      Last Modified: ${project.lastModificationTime ? new Date(project.lastModificationTime).toLocaleDateString() : 'Unknown'}
    `;
    
    Swal.fire({
      title: 'Project Details',
      html: `<pre style="text-align: left; white-space: pre-wrap;">${details}</pre>`,
      icon: 'info',
      confirmButtonText: 'Close',
      showCancelButton: true,
      cancelButtonText: 'Edit Project',
      width: '500px'
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        this.navigateToEdit(project.id);
      }
    });
  }
    deleteProject(id: string): void {
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
          this.projectService.delete(id).subscribe({
            next: () => {
              this.projects = this.projects.filter(p => p.id !== id);
              Swal.fire('Deleted!', 'The project has been deleted.', 'success');
            },
            error: (err) => {
              Swal.fire('Error', 'Something went wrong while deleting.', 'error');
              console.error('Delete failed:', err);
            }
          });
        }
      });
    }
    
}