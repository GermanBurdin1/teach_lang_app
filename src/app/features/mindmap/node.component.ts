import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { MindmapNode } from './models/mindmap-node.model';

@Component({
  selector: 'app-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.css']
})
export class NodeComponent {
  @Input() node!: MindmapNode;
  @Output() add = new EventEmitter<{ parent: MindmapNode }>();
  @Output() zoom = new EventEmitter<MindmapNode>();
  @ViewChild('nodeElement') nodeElementRef!: ElementRef;
  width: number = 0;
  height: number = 0;

  onAddChild(): void {
    this.add.emit({ parent: this.node });
  }

  onZoom(): void {
    this.zoom.emit(this.node);
  }

  resizeTextArea(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }
}
