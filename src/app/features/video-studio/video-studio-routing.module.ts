import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VideoStudioComponent } from './video-studio.component';

const routes: Routes = [
  { path: '', component: VideoStudioComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VideoStudioRoutingModule { }