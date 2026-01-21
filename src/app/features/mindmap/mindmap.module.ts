import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindmapComponent } from './mindmap.component';
import { NodeComponent } from './node.component';
import { MindmapWrapperComponent } from './mindmap-wrapper.component';
import { FormsModule } from '@angular/forms';
import { MindmapRoutingModule } from './mindmap-routing.module';
import { LayoutModule } from '../../layout/layout.module';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConstructorTypeSelectorComponent } from './constructor-type-selector/constructor-type-selector.component';
import { StudentMindmapComponent } from './student-mindmap/student-mindmap.component';
import { MindmapRouterComponent } from './mindmap-router.component';
import { MainComponent } from './main/main.component';
import { CreateMindmapComponent } from './create-mindmap/create-mindmap.component';
import { MatButton } from '@angular/material/button';

@NgModule({
  declarations: [MindmapComponent, NodeComponent, MindmapWrapperComponent],
  imports: [
    CommonModule,
    FormsModule,
    MindmapRoutingModule,
    LayoutModule,
    MatButtonModule,
    MatIconModule,
    // Standalone компоненты
    ConstructorTypeSelectorComponent,
    StudentMindmapComponent,
    MindmapRouterComponent,
    MainComponent,
    CreateMindmapComponent,
    MatButton
  ]
})
export class MindmapModule {}
