import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindmapComponent } from './mindmap.component';
import { NodeComponent } from './node.component';
import { MindmapWrapperComponent } from './mindmap-wrapper.component';
import { FormsModule } from '@angular/forms';
import { MindmapRoutingModule } from './mindmap-routing.module';
import { LayoutModule } from '../../layout/layout.module';

@NgModule({
  declarations: [MindmapComponent, NodeComponent, MindmapWrapperComponent],
  imports: [
    CommonModule,
    FormsModule,
    MindmapRoutingModule,
    LayoutModule  // Импортируем LayoutModule для доступа к app-sidebar
  ]
})
export class MindmapModule {}
