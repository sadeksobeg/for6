import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListProjectComponent } from './list-project/list-project.component';
import { CreateProjectComponent } from './create-project/create-project.component';
import { EditProjectComponent } from './edit-project/edit-project.component';

const routes: Routes = [
    {
      path: '',
      pathMatch: 'full',
      component: ListProjectComponent,
    },
    {
        path: 'create',
        component: CreateProjectComponent
    },
    {
        path: 'edit',
        component: EditProjectComponent
    },
    {
        path: 'edit/:id',
        component: EditProjectComponent
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectsRoutingModule { }
