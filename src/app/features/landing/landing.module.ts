import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './landing.component';
import { PreviewLandingComponent } from './preview-landing/preview-landing.component';

@NgModule({
  declarations: [
    LandingComponent,
    PreviewLandingComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LandingComponent,
    PreviewLandingComponent,
  ]
})
export class LandingModule { }
