import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { ListMediasComponent } from './list-medias/list-medias.component'; // Import ListMediasComponent

import { MediasRoutingModule } from './medias-routing.module';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    MediasRoutingModule,
    RouterModule, // Add RouterModule here
    ListMediasComponent // Import ListMediasComponent as it is standalone
  ]
})
export class MediasModule { }
