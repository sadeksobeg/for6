import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';  // تأكد من استيراد CommonModule
import { ProjectsRoutingModule } from './projects-routing.module';
import { ListProjectComponent } from './list-project/list-project.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,  // تأكد من إضافة CommonModule هنا
    ProjectsRoutingModule,
    ListProjectComponent  // تأكد من استيراد المكون المستقل هنا
  ]
})
export class ProjectsModule { }
