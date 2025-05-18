import { Component, HostListener, OnInit, NgZone } from '@angular/core';
import { MindmapNode } from './models/mindmap-node.model';
import { v4 as uuidv4 } from 'uuid';
import { MindmapService } from './mindmap.service';


@Component({
  selector: 'app-mindmap',
  templateUrl: './mindmap.component.html',
  styleUrls: ['./mindmap.component.css']
})
export class MindmapComponent implements OnInit {
  constructor(
    private zone: NgZone,
    private api: MindmapService
  ) { }


  nodes: MindmapNode[] = [];
  zoomLevel = 1;
  selectedNodes: Set<string> = new Set();
  private isDragging = false;
  private lastMousePosition: { x: number; y: number } | null = null;
  private isMoveMode = false; // активируется после двойного клика
  draggedNode: MindmapNode | null = null;
  potentialDropTarget: MindmapNode | null = null;
  zoomStep = 0.05;
  minZoom = 0.2;
  maxZoom = 2;
  private lastTouchDistance: number | null = null;
  activeModalNode: MindmapNode | null = null;
  activeModalType: 'rule' | 'exception' | 'example' | 'exercise' | null = null;
  grammarShortcuts = [
    { label: 'adj.', insert: 'adj.' },       // прилагательное
    { label: 'v.', insert: 'v.' },           // глагол
    { label: 'n.', insert: 'n.' },           // существительное
    { label: 'pl.', insert: 'pl.' },         // множественное число
    { label: 'm.', insert: 'm.' },           // мужской род
    { label: 'f.', insert: 'f.' },           // женский род
    { label: '≠', insert: '≠' },             // не равно
    { label: '→', insert: '→' },             // указывает на результат
    { label: '!', insert: '!' },             // важное
  ];

  ngOnInit(): void {
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    this.api.getAll().subscribe({
      next: nodes => {
        if (nodes.length === 0) {
          const rootNode: MindmapNode = {
            id: uuidv4(),
            parentId: null,
            title: 'Grammaire',
            x: canvasWidth / 2,
            y: canvasHeight / 2,
            expanded: true,
            width: 200,
            height: 0,
            rule: '',
            exception: '',
            example: '',
            exercise: '',
            side: 'right'
          };

          this.api.createNode(rootNode).subscribe({
            next: created => {
              this.nodes = [created];
              this.deferLayoutUpdate();
            },
            error: err => console.error('❌ Ошибка при создании узла Grammaire', err)
          });

        } else {
          this.nodes = nodes;
          this.deferLayoutUpdate();
        }
      },
      error: err => console.error('Ошибка загрузки узлов', err)
    });

  }

  private deferLayoutUpdate(): void {
    // Подождать, пока Angular нарисует DOM
    setTimeout(() => {
      for (const node of this.nodes) {
        const el = document.getElementById(`node-${node.id}`);
        if (el) {
          node.width = el.offsetWidth;
          node.height = el.offsetHeight;
        }
      }

      this.updateLayout(); // теперь размеры есть — отрисуются и линии
    }, 0);
  }


  addChild(data: { parent: MindmapNode }): void {
    const { parent } = data;

    const GAP_X = 50;
    const NODE_WIDTH = 200;

    const siblings = this.nodes.filter(n => n.parentId === parent.id);
    const index = siblings.length;

    let side: 'left' | 'right';

    if (parent.parentId === null) {
      // Первый уровень (дети корня) — старая логика
      if (index < 5) {
        side = 'right';
      } else if (index < 10) {
        side = 'left';
      } else {
        side = index % 2 === 0 ? 'right' : 'left';
      }
    } else {
      // Внуки и глубже — наследуем сторону от родителя
      side = parent.side ?? 'right';
    }

    const newNode: MindmapNode = {
      id: uuidv4(),
      parentId: parent.id,
      title: 'Nouveau nœud',
      x: 0,
      y: 0,
      expanded: true,
      width: NODE_WIDTH,
      height: 0,
      side,
      rule: '',
      exception: '',
      example: '',
      exercise: ''
    };

    if (parent.expanded === false) {
      parent.expanded = true;
    }

    this.api.createNode(newNode).subscribe({
      next: created => {
        this.nodes.push(created);
        this.selectedNodes.clear();
        this.selectedNodes.add(created.id);

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
      },
      error: err => console.error('Ошибка при создании узла', err)
    });
  }

  toggleZoom(node: MindmapNode): void {
    node.expanded = !node.expanded;
    this.api.updateExpanded(node.id, node.expanded).subscribe({
      next: () => console.log('✅ Статус раскрытия сохранён'),
      error: err => console.error('❌ Ошибка при сохранении раскрытия', err)
    });


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

    if (!node.expanded) return BASE_HEIGHT;

    const allChildren = this.getAllChildren(node);
    if (!allChildren.length) return BASE_HEIGHT;

    const visible = allChildren.filter(c => c.expanded !== false);
    if (!visible.length) return BASE_HEIGHT;

    const height = visible
      .map(child => this.getSubtreeHeight(child))
      .reduce((a, b) => a + b, 0) + (visible.length - 1) * 30;

    return height;
  }




  getVisibleChildren(node: MindmapNode): MindmapNode[] {
    return this.getAllChildren(node).filter(child => child.expanded !== false);
  }




  getVisibleNodes(): MindmapNode[] {
    const result: MindmapNode[] = [];

    const walk = (node: MindmapNode) => {
      result.push(node);
      if (node.expanded !== false) {
        this.getAllChildren(node).forEach(child => walk(child));
      }
    };

    this.nodes.filter(n => n.parentId === null).forEach(root => walk(root));
    return result;
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

    const positionsToSave = this.nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
    this.api.saveAllPositions(positionsToSave).subscribe({
      next: () => console.log('✅ Позиции сохранены'),
      error: err => console.error('❌ Ошибка сохранения позиций', err)
    });


  }


  /**
   * Располагает дочерние узлы (`children`) вдоль оси `y` относительно родительского узла (`parent`).
   * @param children - массив дочерних узлов
   * @param parent - родительский узел
   * @param side - сторона, на которой расположены дочерние узлы (`left` или `right`)
   */
  private layoutChildrenCentered(children: MindmapNode[], parent: MindmapNode, side: 'left' | 'right'): void {
    const visibleChildren = this.getAllChildren(parent).filter(c => c.side === side);
    if (!visibleChildren.length) return;

    const GAP_X = 50;
    const GAP_Y = 20;
    const NODE_WIDTH = 200;

    const subtreeHeights = visibleChildren.map(c => this.getSubtreeHeight(c));
    const totalHeight = subtreeHeights.reduce((a, b) => a + b, 0) + (visibleChildren.length - 1) * GAP_Y;

    let y = parent.y - totalHeight / 2;

    for (let i = 0; i < visibleChildren.length; i++) {
      const child = visibleChildren[i];

      const offsetX = side === 'left'
        ? - (GAP_X + NODE_WIDTH)
        : parent.width + GAP_X;


      child.x = parent.x + offsetX;
      child.y = y + subtreeHeights[i] / 2;

      // layout запускается даже если свёрнут, чтобы зарезервировать пространство
      if (this.hasChildren(child)) {
        this.layoutChildrenCentered(this.getAllChildren(child), child, side);
      }

      y += subtreeHeights[i] + GAP_Y;
    }
  }



  hasChildren = (node: MindmapNode): boolean => {
    return this.nodes.some(n => n.parentId === node.id);
  };


  getAllChildren(node: MindmapNode): MindmapNode[] {
    return this.nodes.filter(n => n.parentId === node.id);
  }

  toggleNodeSelection(data: { node: MindmapNode, additive: boolean }): void {
    const { node, additive } = data;

    if (!additive) this.selectedNodes.clear(); // обычный клик — сбросить всё

    if (this.selectedNodes.has(node.id)) {
      this.selectedNodes.delete(node.id);
    } else {
      this.selectedNodes.add(node.id);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    const step = 30; // шаг перемещения карты

    switch (event.key) {
      case 'ArrowUp':
        this.offsetY += step;
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.offsetY -= step;
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.offsetX += step;
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.offsetX -= step;
        event.preventDefault();
        break;
      case 'Backspace':
        // Не удалять узел, если пользователь в модалке
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.getAttribute('contenteditable') === 'true')
        ) {
          return;
        }

        this.deleteSelectedNodes();
        event.preventDefault();
        break;

      case '1':
        this.centerMindmap();
        event.preventDefault();
        break;
    }
  }


  deleteSelectedNodes(): void {
    const toDelete = new Set<string>();
    for (const id of this.selectedNodes) {
      this.collectWithDescendants(id, toDelete);
    }

    // параллельное удаление всех узлов
    for (const id of toDelete) {
      this.api.deleteNode(id).subscribe({
        next: () => console.log('Удалён узел', id),
        error: err => console.error('Ошибка при удалении', err)
      });
    }

    this.nodes = this.nodes.filter(n => !toDelete.has(n.id));
    this.selectedNodes.clear();
    this.updateLayout();
  }

  private collectWithDescendants(id: string, set: Set<string>): void {
    set.add(id);
    const children = this.nodes.filter(n => n.parentId === id);
    for (const child of children) {
      this.collectWithDescendants(child.id, set);
    }
  }

  // перемещение карты
  public offsetX = 0;
  public offsetY = 0;


  activateMoveMode(event: MouseEvent): void {
    this.isMoveMode = true; // удаляем проверку classList
    console.log('🟢 Двойной клик: включён режим перемещения карты');
  }

  onMouseDown(event: MouseEvent): void {
    if (this.isMoveMode) {
      this.isDragging = true;
      this.lastMousePosition = { x: event.clientX, y: event.clientY };
      console.log('🟡 Начало перемещения', this.lastMousePosition);
      event.preventDefault();
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.isMoveMode = false;
    this.lastMousePosition = null;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.lastMousePosition) {
      const dx = event.clientX - this.lastMousePosition.x;
      const dy = event.clientY - this.lastMousePosition.y;

      this.zone.run(() => {
        this.offsetX += dx;
        this.offsetY += dy;
      });

      this.lastMousePosition = { x: event.clientX, y: event.clientY };
    }
  }


  onDragStart(node: MindmapNode): void {
    this.draggedNode = node;
  }

  onDragEnd(): void {
    this.draggedNode = null;
    this.potentialDropTarget = null;
  }

  onDropOnNode(targetNode: MindmapNode): void {
    if (!this.draggedNode || this.draggedNode.id === targetNode.id) return;

    // Запрещаем дроп в потомка самого себя
    if (this.isDescendant(this.draggedNode, targetNode)) return;
    const nodeToUpdate = this.draggedNode;

    this.draggedNode.parentId = targetNode.id;
    this.draggedNode.side = targetNode.side ?? 'right';
    this.draggedNode.expanded = true;

    this.updateLayout();
    this.draggedNode = null;

    this.api.updateNodePosition(nodeToUpdate.id, {
      parentId: targetNode.id,
      side: nodeToUpdate.side!,
      x: nodeToUpdate.x,
      y: nodeToUpdate.y,
      expanded: nodeToUpdate.expanded ?? true
    }).subscribe({
      next: () => console.log('✅ Позиция узла обновлена'),
      error: err => console.error('❌ Ошибка при сохранении позиции', err)
    });

  }

  private isDescendant(parent: MindmapNode, target: MindmapNode): boolean {
    const children = this.getAllChildren(parent);
    for (const child of children) {
      if (child.id === target.id || this.isDescendant(child, target)) {
        return true;
      }
    }
    return false;
  }



  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 1 : -1;
      const factor = delta > 0 ? 1.02 : 0.98;
      this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * factor));
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (event.touches.length === 2) {
      event.preventDefault();

      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);

      if (this.lastTouchDistance != null) {
        const delta = currentDistance - this.lastTouchDistance;
        const scaleChange = delta > 0 ? 1.01 : 0.99;
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * scaleChange));
      }

      this.lastTouchDistance = currentDistance;
    }
  }

  @HostListener('touchend')
  resetTouchDistance() {
    this.lastTouchDistance = null;
  }

  centerMindmap(): void {
    const container = document.querySelector('.mindmap-container') as HTMLElement;
    if (!container) return;

    const rootNode = this.nodes.find(n => n.parentId === null && n.title.toLowerCase().includes('grammaire'));
    if (!rootNode || !rootNode.width || !rootNode.height) return;

    const containerCenterX = container.clientWidth / 2;
    const containerCenterY = container.clientHeight / 2;

    // 1. Самый дальний видимый узел (внук, правнук и т.д.)
    const allVisibleNodes = this.getVisibleNodes();
    const maxXNode = allVisibleNodes.reduce((max, node) => node.x > max.x ? node : max, allVisibleNodes[0]);
    const maxYNode = allVisibleNodes.reduce((max, node) => node.y > max.y ? node : max, allVisibleNodes[0]);

    // 2. Разница между корнем и крайним узлом
    const deltaX = maxXNode.x - rootNode.x;
    const deltaY = maxYNode.y - rootNode.y;

    // 3. Центр Grammaire
    const nodeCenterX = (rootNode.x + rootNode.width / 2) * this.zoomLevel;
    const nodeCenterY = (rootNode.y + rootNode.height / 2) * this.zoomLevel;

    // 4. Финальные оффсеты
    this.offsetX = containerCenterX - nodeCenterX + deltaX * this.zoomLevel;
    this.offsetY = containerCenterY - nodeCenterY + deltaY * this.zoomLevel;

    console.log("🧭 Центрируем по Grammaire", {
      rootNode,
      maxXNode,
      maxYNode,
      deltaX,
      deltaY,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    });
  }


  onOpenModal(event: { node: MindmapNode, type: 'rule' | 'exception' | 'example' | 'exercise' }) {
    this.focusNode(event.node); // 🧭 моментально сдвигаем карту
    this.activeModalNode = event.node; // 🧊 сразу отображаем модалку
    this.activeModalType = event.type;
  }


  closeModal() {
    this.activeModalNode = null;
    this.activeModalType = null;
  }

  getModalLocalPosition(node: MindmapNode, type: 'rule' | 'exception' | 'example' | 'exercise' | null) {
    if (!node || !type) return {};

    const canvas = document.querySelector('.mindmap-canvas') as HTMLElement;
    if (!canvas) return {};

    const canvasRect = canvas.getBoundingClientRect();
    const offset = 10;
    const style: any = {};

    // Реальные координаты с учётом масштабирования
    const scaledX = node.x * this.zoomLevel + canvasRect.left;
    const scaledY = node.y * this.zoomLevel + canvasRect.top;
    const width = node.width * this.zoomLevel;
    const height = node.height * this.zoomLevel;

    switch (type) {
      case 'rule':
        style.left = `${scaledX + width / 2}px`;
        style.top = `${scaledY + height + offset}px`;
        style.transform = 'translateX(-50%)';
        break;
      case 'exception':
        style.left = `${scaledX + width / 2}px`;
        style.top = `${scaledY - offset}px`;
        style.transform = 'translate(-50%, -100%)';
        break;
      case 'example':
        style.left = `${scaledX + width + offset}px`;
        style.top = `${scaledY + height / 2}px`;
        style.transform = 'translateY(-50%)';
        break;
      case 'exercise':
        style.left = `${scaledX - offset}px`;
        style.top = `${scaledY + height / 2}px`;
        style.transform = 'translateX(-100%) translateY(-50%)';
        break;
    }

    return style;
  }


  focusNode(node: MindmapNode): void {
    const container = document.querySelector('.mindmap-container') as HTMLElement;
    if (!container || !node.width || !node.height) return;

    const containerCenterX = container.clientWidth / 2;
    const containerCenterY = container.clientHeight / 2;

    this.offsetX = containerCenterX - (node.x + node.width / 2) * this.zoomLevel;
    this.offsetY = containerCenterY - (node.y + node.height / 2) * this.zoomLevel;
  }



  onModalInput(): void {
    const nodeId = this.activeModalNode?.id;
    const field = this.activeModalType;
    const content = this.activeModalNode?.[field!];

    if (!nodeId || !field) return;

    this.api.updateNodeText(nodeId, field, content!).subscribe({
      next: () => console.log('✅ Сохранено:', { nodeId, field }),
      error: err => console.error('❌ Ошибка при сохранении:', err)
    });
  }

  insertShortcut(text: string): void {
    const current = this.activeModalNode?.[this.activeModalType!] || '';
    this.activeModalNode![this.activeModalType!] = current + ' ' + text;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    this.api.bulkSave(this.nodes).subscribe({
      next: () => console.log('✅ Все узлы сохранены перед закрытием'),
      error: err => console.error('❌ Ошибка bulk save перед закрытием', err)
    });
  }

  onTitleChange(event: { nodeId: string, newTitle: string }) {
    this.api.updateTitle(event.nodeId, event.newTitle).subscribe({
      next: () => console.log('✅ Заголовок сохранён'),
      error: err => console.error('❌ Ошибка при сохранении заголовка', err)
    });
  }



}
