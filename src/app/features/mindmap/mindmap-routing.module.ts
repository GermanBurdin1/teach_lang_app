import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MindmapWrapperComponent } from './mindmap-wrapper.component';
import { MainComponent } from './main/main.component';

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'instant', component: MindmapWrapperComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MindmapRoutingModule {}
