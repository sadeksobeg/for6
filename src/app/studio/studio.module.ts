import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StudioRoutingModule } from './studio-routing.module';
import { StudioComponent } from './studio.component';


@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    StudioRoutingModule,
    StudioComponent
  ],
  providers: [],
  exports: []
})
export class StudioModule { }
