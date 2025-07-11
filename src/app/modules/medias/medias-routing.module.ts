import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ListMediasComponent } from './list-medias/list-medias.component'
import { CreateMediaComponent } from './create-media/create-media.component';
import { EditMediaComponent } from './edit-media/edit-media.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ListMediasComponent,
  },
  {
    path: 'create',
    component: CreateMediaComponent,
  },
  {
    path: 'edit/:id',
    component: EditMediaComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MediasRoutingModule { }
