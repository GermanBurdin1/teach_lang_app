import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindmapComponent } from './mindmap.component';
import { NodeComponent } from './node.component';
import { FormsModule } from '@angular/forms';
import { MindmapRoutingModule } from './mindmap-routing.module';

@NgModule({
  declarations: [MindmapComponent, NodeComponent],
  imports: [
    CommonModule,
    FormsModule,
    MindmapRoutingModule  
  ]
})
export class MindmapModule {}
