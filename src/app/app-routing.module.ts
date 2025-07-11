import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/studio',
    pathMatch: 'full'
  },
  {
    path: 'studio',
    loadChildren: () => import('./features/video-studio/video-studio.module').then(m => m.VideoStudioModule)
  },
  {
    path: '**',
    redirectTo: '/studio'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }