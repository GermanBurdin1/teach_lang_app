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
  public offsetX = 0;
  public offsetY = 0;


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
    const parentRight = parent.x + parent.width;
    const childRight = child.x + child.width;

    // Если родитель левее ребёнка — стрелка идёт слева направо
    const isLeftToRight = parent.x < child.x;

    const startX = isLeftToRight ? parentRight : parent.x;
    const startY = parent.y + parent.height / 2;

    const endX = isLeftToRight ? child.x : childRight;
    const endY = child.y + child.height / 2;

    const dx = Math.abs(endX - startX) * 0.5;

    return `M ${startX},${startY}
            C ${startX + (isLeftToRight ? dx : -dx)},${startY}
              ${endX + (isLeftToRight ? -dx : dx)},${endY}
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
    const BASE_HEIGHT = node.height || 100;


    if (!node.expanded || !node.children?.length) {
      console.log("1");
      return BASE_HEIGHT;
    }

    const visibleChildren = node.children.filter(child => child.expanded !== false);
    if (!visibleChildren.length) {console.log("2"); return BASE_HEIGHT;}

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

    setTimeout(() => {
      const canvas = document.querySelector('.mindmap-canvas') as HTMLElement;
      if (!canvas) return;

      let minY = Infinity, maxY = -Infinity;
      let minX = Infinity, maxX = -Infinity;

      for (const node of this.getVisibleNodes()) {
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y + node.height);
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x + node.width);
      }

      const paddingTop = minY < 0 ? Math.abs(minY) + 100 : 0;
      const paddingLeft = minX < 0 ? Math.abs(minX) + 100 : 0;

      const requiredHeight = maxY + paddingTop + 100;
      const requiredWidth = maxX + paddingLeft + 100;

      canvas.style.minHeight = `${requiredHeight}px`;
      canvas.style.minWidth = `${requiredWidth}px`;
      if (minY < 0) {
        const shift = Math.abs(minY) + 100;
        canvas.style.transform = `translateY(${shift}px)`;
        canvas.style.height = `${maxY + shift + 100}px`;
      } else {
        canvas.style.transform = `translateY(0)`;
        canvas.style.height = `${maxY + 100}px`;
      }

      canvas.style.paddingLeft = `${paddingLeft}px`;

    }, 0);


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
