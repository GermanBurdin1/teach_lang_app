import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import { MindmapNode } from './models/mindmap-node.model';

@Component({
  selector: 'app-node',
  templateUrl: './node.component.html',
  styleUrls: ['./node.component.css']
})
export class NodeComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    if (this.isSelected && this.textAreaRef) {
      setTimeout(() => {
        this.textAreaRef.nativeElement.focus();
      });
    }
  }
  @Input() node!: MindmapNode;
  @Output() add = new EventEmitter<{ parent: MindmapNode }>();
  @Output() zoom = new EventEmitter<MindmapNode>();
  @Output() addSibling = new EventEmitter<{ sibling: MindmapNode }>();
  @Output() toggleSelect = new EventEmitter<{ node: MindmapNode; additive: boolean }>();
  @Output() shortcutAddSibling = new EventEmitter<MindmapNode>();
  @Output() shortcutAddChild = new EventEmitter<MindmapNode>();
  @ViewChild('nodeElement') nodeElementRef!: ElementRef;
  @ViewChild('textAreaRef') textAreaRef!: ElementRef<HTMLTextAreaElement>;
  @Input() hasChildren!: (node: MindmapNode) => boolean;
  @Input() isSelected = false;

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

@HostListener('document:keydown', ['$event'])
handleKeyDown(event: KeyboardEvent): void {
  if (!this.isSelected) return;

  if (event.key === 'Tab') {
    this.shortcutAddChild.emit(this.node);
    event.preventDefault();
  }

  if (event.key === 'Enter') {
    this.shortcutAddSibling.emit(this.node);
    event.preventDefault();
  }
}


}
