import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MindmapWrapperComponent } from './mindmap-wrapper.component';

const routes: Routes = [
  { path: '', component: MindmapWrapperComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MindmapRoutingModule {}
