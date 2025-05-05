import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MindmapNode } from './models/mindmap-node.model';

@Component({
  selector: 'app-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.css']
})
export class NodeComponent {
  @Input() node!: MindmapNode;
  @Output() add = new EventEmitter<MindmapNode>();
  @Output() zoom = new EventEmitter<MindmapNode>();

  onAddChild(): void {
    console.log('🟡 onAddChild()', this.node);
    this.add.emit(this.node); // 👈 Передаём текущий узел как аргумент
  }

  onZoom(): void {
    this.zoom.emit(this.node); // 👈 Тоже передаём узел
  }
}
