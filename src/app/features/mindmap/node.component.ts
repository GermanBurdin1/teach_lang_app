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
  @Output() addSibling = new EventEmitter<{ sibling: MindmapNode }>();
  @Input() hasChildren!: (node: MindmapNode) => boolean;
  @ViewChild('nodeElement') nodeElementRef!: ElementRef;
  @Input() isSelected = false;
  @Output() toggleSelect = new EventEmitter<{ node: MindmapNode; additive: boolean }>();


  width: number = 0;
  height: number = 0;

  side?: 'left' | 'right';


  onSelect(): void {
    this.isSelected = !this.isSelected;
  }

  onAddChild(event: MouseEvent): void {
    event.stopPropagation(); // не сбрасывай selected
    this.add.emit({ parent: this.node });
  }

  onAddSibling(event: MouseEvent): void {
    event.stopPropagation();
    this.addSibling.emit({ sibling: this.node });
  }

  onZoom(): void {
    this.zoom.emit(this.node);
  }

  resizeTextArea(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  onClick(event: MouseEvent): void {
  this.toggleSelect.emit({ node: this.node, additive: event.shiftKey });
  event.stopPropagation();
}


}
