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
  @Output() select = new EventEmitter<MindmapNode>();
  @ViewChild('nodeElement') nodeElementRef!: ElementRef;
  @Input() zoomedNode: MindmapNode | null = null;
  @Input() rootNodeId: string = '';
  width: number = 0;
  height: number = 0;

  selected: boolean = false;
  side?: 'left' | 'right';


  ngOnInit() {
    console.log('NODE DATA', this.node);
  }

  onSelect(): void {
    this.selected = !this.selected;
    this.select.emit(this.node); // просто уведомляем, что узел выбран
  }


  zoomOrAddChild(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isTopLevel) {
      this.zoom.emit(this.node); // ныряем
    } else {
      this.add.emit({ parent: this.node }); // добавляем внука
    }
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

  get isTopLevel(): boolean {
    return !this.zoomedNode && this.node.parentId === this.rootNodeId;
  }

  getNodeStyle(): { [key: string]: string } {
    if (this.node.id !== this.zoomedNode?.id) {
      return {
        left: this.node.x + 'px',
        top: this.node.y + 'px',
        position: 'absolute'
      };
    } else {
      return {
        position: 'relative'
      };
    }
  }




}
