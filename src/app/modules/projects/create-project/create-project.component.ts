import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateUpdateProjectDto, ProjectService } from '@proxy/projects';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss']
})
export class CreateProjectComponent {
  project: CreateUpdateProjectDto = {
    title: '',
    description: ''
  };

  constructor(private projectService: ProjectService, private router: Router) {}

  submit() {
    this.projectService.create(this.project).subscribe(() => {
      this.router.navigate(['/projects']);
    });
  }
}
