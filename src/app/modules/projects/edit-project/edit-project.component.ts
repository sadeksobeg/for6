import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService, ProjectDto, CreateUpdateProjectDto } from '@proxy/projects';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-project.component.html',
  styleUrls: ['./edit-project.component.scss']
})
export class EditProjectComponent implements OnInit {
  projectId!: string;
  project: CreateUpdateProjectDto = { title: '', description: '' };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id')!;
    this.projectService.get(this.projectId).subscribe((data: ProjectDto) => {
      this.project = {
        title: data.title,
        description: data.description
      };
    });
  }

  update(): void {
    this.projectService.update(this.projectId, this.project).subscribe(() => {
      this.router.navigate(['/projects']);
    });
  }
}
