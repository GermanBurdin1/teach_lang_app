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
  zoomedNode: MindmapNode | null = null;
  rootNodeId = '';
  focusedNodeId: string | null = null;
  selectedNodeId: string | null = null;


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
    this.rootNodeId = rootNode.id;
    this.nodes.push(rootNode);
  }

  addChild(data: { parent: MindmapNode }): void {
    const { parent } = data;
    const NODE_WIDTH = 200;
    const GAP_X = 50;
    const GAP_Y = 30;

    const isZoomed = this.zoomedNode?.id === parent.id;
    const siblings = this.nodes.filter(n => n.parentId === parent.id);
    const index = siblings.length;

    let side: 'left' | 'right' = 'right';
    if (!isZoomed) {
      if (index < 5) side = 'right';
      else if (index < 10) side = 'left';
      else side = (index % 2 === 0) ? 'right' : 'left';
    }

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
      side
    };

    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(newNode);
    this.nodes.push(newNode);

    setTimeout(() => {
      const parentEl = document.getElementById(`node-${parent.id}`);
      if (parentEl) {
        parent.width = parentEl.offsetWidth;
        parent.height = parentEl.offsetHeight;
      }

      if (isZoomed) {
        // Только если зум активен — размещаем детей по кругу
        const circularSiblings = parent.children || [];
        const i = circularSiblings.length - 1;
        const radius = 200;
        const angle = (2 * Math.PI / circularSiblings.length) * i;

        newNode.x = parent.x + radius * Math.cos(angle);
        newNode.y = parent.y + radius * Math.sin(angle);
      } else {
        // 💡 ВНИМАНИЕ: ЭТА ЧАСТЬ НЕ ТРОНУТА
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

        const leftChildren = siblings.filter(c => c.side === 'left');
        const rightChildren = siblings.filter(c => c.side === 'right');

        const layoutSide = (children: MindmapNode[], side: 'left' | 'right') => {
          const totalHeight = children.reduce((sum, c) => sum + c.height, 0) + (children.length - 1) * GAP_Y;
          let y = parent.y - totalHeight / 2;

          children.forEach((child) => {
            const offsetX = side === 'left' ? -(GAP_X + NODE_WIDTH) : (parent.width + GAP_X);
            child.x = parent.x + offsetX;
            child.y = y;
            y += child.height + GAP_Y;
          });
        };

        layoutSide(leftChildren, 'left');
        layoutSide(rightChildren, 'right');
      }
    }, 0);
  }

  toggleZoom(node: MindmapNode | null): void {
    if (node === null || this.zoomedNode?.id === node.id) {
      this.zoomedNode = null;
      this.zoomLevel = 1;
      this.focusedNodeId = null;
    } else {
      this.focusedNodeId = this.zoomedNode?.id || null; // сохранить текущий как фон
      this.zoomedNode = node;
      this.zoomLevel = 2;
    }
  }



  trackById(index: number, node: MindmapNode): string {
    return node.id;
  }

  generatePath(parent: MindmapNode, child: MindmapNode): string {
    const isLeft = child.side === 'left';

    const startX = isLeft ? parent.x : parent.x + parent.width;
    const startY = parent.y + parent.height / 2;

    const endX = isLeft ? child.x + child.width : child.x;
    const endY = child.y + child.height / 2;

    const dx = Math.abs(endX - startX) * 0.5;

    return `M ${startX},${startY}
            C ${startX + (isLeft ? -dx : dx)},${startY}
              ${endX + (isLeft ? dx : -dx)},${endY}
              ${endX},${endY}`;
  }


  addSibling(data: { sibling: MindmapNode }) {
    const sibling = data.sibling;
    const parent = this.nodes.find(n => n.id === sibling.parentId);
    if (parent) {
      this.addChild({ parent });
    }
  }

  get focusedNode(): MindmapNode | null {
    return this.nodes.find(n => n.id === this.focusedNodeId) || null;
  }

  onNodeSelect(node: MindmapNode): void {
    this.selectedNodeId = node.id;
  }

}
