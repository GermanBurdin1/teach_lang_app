import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MindmapComponent } from './mindmap.component';

const routes: Routes = [
  { path: '', component: MindmapComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MindmapRoutingModule {}
