import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindmapComponent } from './mindmap.component';
import { NodeComponent } from './node.component';
import { MindmapWrapperComponent } from './mindmap-wrapper.component';
import { FormsModule } from '@angular/forms';
import { MindmapRoutingModule } from './mindmap-routing.module';
import { LayoutModule } from '../../layout/layout.module';
import { CreateMindmapComponent } from './create-mindmap/create-mindmap.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [MindmapComponent, NodeComponent, MindmapWrapperComponent, CreateMindmapComponent],
  imports: [
    CommonModule,
    FormsModule,
    MindmapRoutingModule,
    LayoutModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class MindmapModule {}
