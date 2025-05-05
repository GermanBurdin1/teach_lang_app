import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MindmapNode } from './models/mindmap-node.model';

@Component({
  selector: 'app-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.css']
})
export class NodeComponent {
  @Input() node!: MindmapNode;
  @Output() add = new EventEmitter<void>();
  @Output() zoom = new EventEmitter<void>();

  onAddChild(): void {
    this.add.emit();
  }

  onZoom(): void {
    this.zoom.emit();
  }
}
