import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MindmapWrapperComponent } from './mindmap-wrapper.component';
import { MainComponent } from './main/main.component';
import { CreateMindmapComponent } from './create-mindmap/create-mindmap.component';
import { ConstructorTypeSelectorComponent } from './constructor-type-selector/constructor-type-selector.component';

const routes: Routes = [
  { path: '', component: ConstructorTypeSelectorComponent },
  { path: 'mindmap', component: MainComponent },
  { path: 'instant', component: MindmapWrapperComponent },
  { path: 'create', component: CreateMindmapComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MindmapRoutingModule {}
