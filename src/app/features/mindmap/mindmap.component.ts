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
    const siblings = this.nodes.filter(n => n.parentId === parent.id);
    const index = siblings.length;

    let side: 'left' | 'right';

    if (index < 5) {
      side = 'right';
    } else if (index < 10) {
      side = 'left';
    } else {
      side = (index % 2 === 0) ? 'right' : 'left';
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

    if (parent.expanded === false) {
      parent.expanded = true;
    }

    this.nodes.push(newNode);

    setTimeout(() => {
      for (const node of this.nodes) {
        const el = document.getElementById(`node-${node.id}`);
        if (el) {
          node.width = el.offsetWidth;
          node.height = el.offsetHeight;
        }
      }
      this.updateLayout();
    }, 0);

  }




  toggleZoom(node: MindmapNode): void {
    node.expanded = !node.expanded;

    setTimeout(() => {
      for (const node of this.nodes) {
        const el = document.getElementById(`node-${node.id}`);
        if (el) {
          node.width = el.offsetWidth;
          node.height = el.offsetHeight;
        }
      }
      this.updateLayout();
    }, 0);
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

  /**
   * Calculates the height of a subtree rooted at the given node.
   * This takes into account the height of the node itself, as well as the
   * heights of all visible children and their vertical spacing.
   * @param node the root node of the subtree
   * @returns the total height of the subtree
   */
  private getSubtreeHeight(node: MindmapNode): number {
    console.log(node)
    const BASE_HEIGHT = node.height || 100;


    if (!node.expanded || !node.children?.length) {
      return BASE_HEIGHT;
    }

    const visibleChildren = node.children.filter(child => child.expanded !== false);
    if (!visibleChildren.length) return BASE_HEIGHT;

    const subtreeHeight = visibleChildren
      .map(child => this.getSubtreeHeight(child))
      .reduce((a, b) => a + b, 0) + (visibleChildren.length - 1) * 30;

    return subtreeHeight;
  }



  private getVisibleChildren(node: MindmapNode): MindmapNode[] {
    return (node.children || []).filter(child => child.expanded !== false);
  }



  getVisibleNodes(): MindmapNode[] {
    const visibleNodes: MindmapNode[] = [];

    const collect = (node: MindmapNode) => {
      visibleNodes.push(node);
      if (node.expanded !== false && node.children?.length) {
        node.children.forEach(child => collect(child));
      }
    };

    // Начинаем с корней
    const rootNodes = this.nodes.filter(n => n.parentId === null);
    rootNodes.forEach(root => collect(root));

    return visibleNodes;
  }

  /**
   * Updates the layout of the mindmap nodes.
   *
   * Iterates over all root nodes (i.e., nodes with `parentId === null`)
   * and for each root node, it lays out its children in a centered manner
   * on both the left and right sides of the root node.
   */
  private updateLayout(): void {
    const GAP_X = 50;
    const GAP_Y = 30;
    const NODE_WIDTH = 200;

    const layoutSubtree = (parent: MindmapNode) => {
      const children = this.nodes.filter(n => n.parentId === parent.id);
      const leftChildren = children.filter(c => c.side === 'left');
      const rightChildren = children.filter(c => c.side === 'right');

      this.layoutChildrenCentered(leftChildren, parent, 'left');
      this.layoutChildrenCentered(rightChildren, parent, 'right');
    };


    const rootNodes = this.nodes.filter(n => n.parentId === null);
    for (const root of rootNodes) {
      layoutSubtree(root);
    }
  }


  /**
   * Располагает дочерние узлы (`children`) вдоль оси `y` относительно родительского узла (`parent`).
   * @param children - массив дочерних узлов
   * @param parent - родительский узел
   * @param side - сторона, на которой расположены дочерние узлы (`left` или `right`)
   */
  private layoutChildrenCentered(children: MindmapNode[], parent: MindmapNode, side: 'left' | 'right'): void {
    if (!children.length) return;

    const GAP_X = 50;
    const GAP_Y = 20;
    const NODE_WIDTH = 200;

    const isRoot = parent.parentId === null;

    if (!isRoot) {
      // === ВНУКИ ===
      const subtreeHeights = children.map(c => this.getSubtreeHeight(c));
      const totalHeight = subtreeHeights.reduce((a, b) => a + b, 0) + (children.length - 1) * GAP_Y;

      let y = parent.y - totalHeight / 2;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        const offsetX = side === 'left'
          ? -(parent.width + GAP_X + NODE_WIDTH)
          : parent.width + GAP_X;

        child.x = parent.x + offsetX;
        child.y = y + subtreeHeights[i] / 2;

        if (child.expanded !== false && child.children?.length) {
          this.layoutChildrenCentered(this.getVisibleChildren(child), child, side);
        }

        y += subtreeHeights[i] + GAP_Y;
      }

      return;
    }

    // === ДЕТИ КОРНЯ ===
    const subtreeHeights = children.map(c => this.getSubtreeHeight(c));
    const totalHeight = subtreeHeights.reduce((a, b) => a + b, 0) + (children.length - 1) * GAP_Y;

    let y = parent.y - totalHeight / 2;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      const offsetX = side === 'left'
        ? -(parent.width + GAP_X + NODE_WIDTH)
        : parent.width + GAP_X;

      child.x = parent.x + offsetX;
      child.y = y + subtreeHeights[i] / 2;

      if (child.expanded !== false && child.children?.length) {
        this.layoutChildrenCentered(this.getVisibleChildren(child), child, side);
      }

      y += subtreeHeights[i] + GAP_Y;
    }
  }








}
