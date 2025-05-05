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
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    const rootNode: MindmapNode = {
      id: uuidv4(),
      parentId: null,
      title: 'Grammaire',
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      expanded: false,
      children: [],
      width: 0,
      height: 0
    };
    this.nodes.push(rootNode);
  }

  addChild(data: { parent: MindmapNode }): void {
    const { parent } = data;

    const GAP_X = 50;
    const GAP_Y = 30;
    const NODE_WIDTH = 200;

    const newNode: MindmapNode = {
      id: uuidv4(),
      parentId: parent.id,
      title: 'Nouveau nœud',
      x: 0,
      y: 0,
      expanded: true,
      children: [],
      width: NODE_WIDTH,
      height: 0,
    };

    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(newNode);
    this.nodes.push(newNode);

    // Дать Angular время на отрисовку
    setTimeout(() => {
      const parentEl = document.getElementById(`node-${parent.id}`);
      const parentRect = parentEl?.getBoundingClientRect();
      const parentWidth = parentRect?.width || NODE_WIDTH;

      if (parentEl) {
        parent.width = parentEl.offsetWidth;
        parent.height = parentEl.offsetHeight;
      }

      const siblings = this.nodes.filter(n => n.parentId === parent.id);

      const heights: number[] = siblings.map(child => {
        const el = document.getElementById(`node-${child.id}`);
        const height = el?.getBoundingClientRect().height || 100;
        child.height = height;
        return height;
      });

      const totalHeight = heights.reduce((a, b) => a + b, 0) + (siblings.length - 1) * GAP_Y;
      const startY = parent.y - totalHeight / 2;

      let currentY = startY;

      siblings.forEach((child, i) => {
        child.x = parent.x + parentWidth + GAP_X; // ✅ теперь учитывает реальную ширину
        child.y = currentY;
        currentY += child.height + GAP_Y;
      });
    }, 0);

  }



  toggleZoom(node: MindmapNode): void {
    node.expanded = !node.expanded;
  }

  trackById(index: number, node: MindmapNode): string {
    return node.id;
  }

  generatePath(parent: MindmapNode, child: MindmapNode): string {
    console.log('Drawing path from:', parent, 'to:', child);
    const startX = parent.x + parent.width;
    const startY = parent.y + parent.height / 2;
    const endX = child.x;
    const endY = child.y + child.height / 2;

    const dx = (endX - startX) * 0.5;

    return `M ${startX},${startY}
            C ${startX + dx},${startY}
              ${endX - dx},${endY}
              ${endX},${endY}`;
  }

  addSibling(data: { sibling: MindmapNode }) {
    const sibling = data.sibling;
    const parent = this.nodes.find(n => n.id === sibling.parentId);
    if (parent) {
      this.addChild({ parent });
    }
  }


}
