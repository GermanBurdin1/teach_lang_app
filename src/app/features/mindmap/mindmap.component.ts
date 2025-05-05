import { Component, OnInit } from '@angular/core';
import { MindmapNode } from './models/mindmap-node.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-mindmap',
  templateUrl: './mindmap.component.html',
  styleUrls: ['./mindmap.component.css']
})
export class MindmapComponent implements OnInit {

  nodes: MindmapNode[] = [];
  zoomLevel = 1;

  ngOnInit(): void {
    const rootNode: MindmapNode = {
      id: uuidv4(),
      parentId: null,
      title: 'Grammaire',
      x: 500,
      y: 300,
      expanded: false,
      children: []
    };
    this.nodes.push(rootNode);
  }

  addChild(parent: MindmapNode): void {
    const newNode: MindmapNode = {
      id: uuidv4(),
      parentId: parent.id,
      title: 'Nouveau nœud',
      x: (parent.x || 0) + 150,
      y: (parent.y || 0) + (parent.children?.length || 0) * 80,
      expanded: false,
      children: []
    };
    parent.children = parent.children || [];
    parent.children.push(newNode);
    parent.expanded = true;

    console.log('[MindmapComponent] New child added:', newNode);
    console.log('[MindmapComponent] Updated parent:', parent);
  }

  toggleZoom(node: MindmapNode): void {
    node.expanded = !node.expanded;
  }

  trackById(index: number, node: MindmapNode): string {
    return node.id;
  }
}
