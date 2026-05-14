import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LayoutModule } from '../../../layout/layout.module';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import type {
  ArrowElement,
  CanvasElement,
  CircleElement,
  CanvasSceneNode,
  ParentFrame,
  Point,
  RectElement
} from './canvas-scene.model';
import { tipOnCircleWorld, tipOnRectWorld } from './arrow-decoration.utils';
import { normalizeCanvasElements } from './canvas-scene.store';
import { CanvasSceneStore } from './canvas-scene.store';
import {
  CreateChildSceneDialogComponent,
  type CreateChildSceneDialogResult
} from './create-child-scene-dialog.component';

type CanvasTool = 'select' | 'rectangle' | 'arrow' | 'text';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

interface ScreenPosition {
  left: string;
  top: string;
}

@Component({
  selector: 'app-canvas-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LayoutModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    RouterLink
  ],
  templateUrl: './canvas-board.component.html',
  styleUrls: ['./canvas-board.component.css']
})
export class CanvasBoardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainerRef', { static: true }) canvasContainerRef!: ElementRef<HTMLElement>;
  @ViewChild('surfaceRef') surfaceRef!: ElementRef<HTMLElement>;
  @ViewChild('canvasScrollRef') canvasScrollRef?: ElementRef<HTMLElement>;
  @ViewChild('rectTextArea') rectTextAreaRef?: ElementRef<HTMLTextAreaElement>;

  readonly tools: CanvasTool[] = ['select', 'rectangle', 'arrow', 'text'];
  activeTool: CanvasTool = 'select';
  elements: CanvasElement[] = [];
  selectedElementId: string | null = null;
  /** Inline editor for `RectElement.innerText`; overlay aligned to screen bounds. */
  editingRectangleId: string | null = null;
  rectEditorValue = '';
  /** Pending pointer-down on a rectangle in select mode (confirmed on up if movement is small). */
  private rectEditClickDown: { elementId: string; clientX: number; clientY: number } | null = null;
  overviewOpen = false;
  /** Shape kind placed on arrow tip with Maj+Entrée (toggle in toolbar). */
  arrowDecorationKind: 'rectangle' | 'circle' = 'rectangle';
  /** Which scroll axes are active on .canvas-scroll (avoids both bars when only one axis overflows). */
  scrollMode: 'none' | 'x' | 'y' | 'xy' = 'none';
  /** CSS scale applied to the whole sheet in overview mode (fits scroll viewport). */
  overviewFitScale = 1;
  overviewOuterW = 0;
  overviewOuterH = 0;

  private savedOverviewView = { scale: 1, panX: 0, panY: 0 };
  private savedOverviewScroll = { left: 0, top: 0 };
  /** Full sheet size before switching to overview (restored on close). */
  private savedExtendedBitmap: { w: number; h: number } | null = null;

  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private dragStart: Point | null = null;
  private draftElement: CanvasElement | null = null;
  private isMoveHandleDrag = false;
  private lastPointerWorld: Point | null = null;
  private isResizingRectangle = false;
  private resizeHandle: ResizeHandle | null = null;
  private resizeStartRect: RectElement | null = null;
  private scale = 1;
  private panX = 0;
  private panY = 0;
  private readonly minScale = 0.3;
  private readonly maxScale = 3;
  private baseCanvasWidth = 0;
  private baseCanvasHeight = 0;
  private extraLeft = 0;
  private extraRight = 0;
  private extraTop = 0;
  private extraBottom = 0;
  private readonly minPercent = -200;
  private readonly maxPercent = 200;
  horizontalPercentLabel = '100%';
  verticalPercentLabel = '100%';

  /** Current route scene id (null before first navigation resolve). */
  activeSceneId: string | null = null;
  sceneBreadcrumb: { id: string; title: string; outlineNumber: string }[] = [];
  parentPortalBoxStyle: Record<string, string> | null = null;

  get currentScene(): CanvasSceneNode | null {
    return this.activeSceneId ? (this.canvasSceneStore.getScene(this.activeSceneId) ?? null) : null;
  }

  get sceneTitleLine(): string {
    const n = this.currentScene;
    return n ? `${n.outlineNumber} · ${n.title}` : 'Canvas board';
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly canvasSceneStore: CanvasSceneStore,
    private readonly dialog: MatDialog
  ) {}

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((pm) => {
      const param = pm.get('sceneId');
      if (this.activeSceneId) {
        this.persistSceneSnapshot();
      }
      if (!param) {
        const id = this.canvasSceneStore.ensureDefaultRootScene();
        void this.router.navigate(['/constructeurs', 'canvas-board', id], { replaceUrl: true });
        return;
      }
      let sceneId = param;
      if (!this.canvasSceneStore.getScene(sceneId)) {
        const fallback =
          this.canvasSceneStore.listRootIds()[0] ?? this.canvasSceneStore.ensureDefaultRootScene();
        void this.router.navigate(['/constructeurs', 'canvas-board', fallback], { replaceUrl: true });
        return;
      }
      this.activeSceneId = sceneId;
      this.applySceneFromStore(sceneId);
      this.sceneBreadcrumb = this.canvasSceneStore.getBreadcrumb(sceneId);
      this.resizeCanvas();
      this.syncCanvasCssSize();
      this.render();
      this.updateParentPortalOverlay();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.persistSceneSnapshot();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
    this.render();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    this.handlePointerMove(event);
  }

  @HostListener('document:mouseup', ['$event'])
  onDocumentMouseUp(event: MouseEvent): void {
    this.handlePointerUp(event);
  }

  @HostListener('document:touchend', ['$event'])
  onDocumentTouchEnd(event: TouchEvent): void {
    const t = event.changedTouches[0];
    if (t) {
      this.handlePointerUp({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    } else {
      this.handlePointerUp(undefined);
    }
  }

  setTool(tool: CanvasTool): void {
    this.activeTool = tool;
    if (tool !== 'select') {
      this.rectEditClickDown = null;
      this.closeRectangleTextEditor();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goToParentScene();
      return;
    }
    if (event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && event.code === 'KeyS') {
      event.preventDefault();
      void this.openCreateChildSceneDialog();
      return;
    }
    if (event.key === 'Enter' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const t = event.target as HTMLElement | null;
      if (t?.isContentEditable) {
        return;
      }
      if (!t?.closest('button, a, input, textarea, mat-button-toggle, mat-option, [role="dialog"]')) {
        const sel = this.getSelectedElement();
        if (sel?.type === 'arrow') {
          event.preventDefault();
          event.stopPropagation();
          this.addOrReplaceArrowEndDecoration();
          return;
        }
        if (sel?.type === 'rectangle' || sel?.type === 'text' || sel?.type === 'circle') {
          event.preventDefault();
          event.stopPropagation();
          this.createArrowWithDecorationFromSource(sel);
          return;
        }
      }
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedElementId) {
      this.deleteSelectedElement();
      event.preventDefault();
    }
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (this.overviewOpen) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    this.handleCanvasPrimaryDown(event.clientX, event.clientY);
  }

  onCanvasTouchStart(event: TouchEvent): void {
    if (this.overviewOpen || event.touches.length !== 1) {
      return;
    }
    const t = event.touches[0]!;
    this.handleCanvasPrimaryDown(t.clientX, t.clientY);
  }

  private handleCanvasPrimaryDown(clientX: number, clientY: number): void {
    const point = this.screenToWorld(this.getCanvasPointFromClient(clientX, clientY));

    if (this.activeTool === 'text') {
      this.rectEditClickDown = null;
      this.closeRectangleTextEditor();
      const value = window.prompt('Texte:');
      if (value && value.trim()) {
        this.elements.push({
          id: crypto.randomUUID(),
          type: 'text',
          x: point.x,
          y: point.y,
          text: value.trim(),
          childSceneIds: []
        });
        this.render();
      }
      return;
    }

    if (this.activeTool === 'select') {
      const hit = this.findElementAtPoint(point);
      this.selectedElementId = hit?.id ?? null;
      if (hit?.type === 'rectangle') {
        if (this.editingRectangleId && this.editingRectangleId !== hit.id) {
          this.closeRectangleTextEditor();
        }
        this.rectEditClickDown = { elementId: hit.id, clientX, clientY };
      } else {
        this.rectEditClickDown = null;
        this.closeRectangleTextEditor();
      }
      this.render();
      return;
    }

    this.rectEditClickDown = null;
    this.closeRectangleTextEditor();
    this.isDrawing = true;
    this.dragStart = point;

    if (this.activeTool === 'rectangle') {
      this.draftElement = {
        id: crypto.randomUUID(),
        type: 'rectangle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        innerText: '',
        childSceneIds: []
      };
    }

    if (this.activeTool === 'arrow') {
      this.draftElement = {
        id: crypto.randomUUID(),
        type: 'arrow',
        start: { ...point },
        end: { ...point },
        childSceneIds: []
      };
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    this.handlePointerMove(event);
  }

  onCanvasMouseUp(event?: MouseEvent): void {
    this.handlePointerUp(event);
  }

  private handlePointerMove(event: MouseEvent): void {
    const point = this.screenToWorld(this.getCanvasPoint(event));

    if (this.isResizingRectangle && this.resizeHandle && this.resizeStartRect) {
      this.applyRectangleResize(point);
      this.render();
      return;
    }

    if (this.isMoveHandleDrag && this.lastPointerWorld) {
      const dx = point.x - this.lastPointerWorld.x;
      const dy = point.y - this.lastPointerWorld.y;
      this.translateSelected(dx, dy);
      this.lastPointerWorld = point;
      this.render();
      return;
    }

    if (!this.isDrawing || !this.dragStart || !this.draftElement) {
      return;
    }

    if (this.draftElement.type === 'rectangle') {
      this.draftElement.width = point.x - this.dragStart.x;
      this.draftElement.height = point.y - this.dragStart.y;
    }

    if (this.draftElement.type === 'arrow') {
      this.draftElement.end = point;
    }

    this.render();
  }

  private handlePointerUp(event?: MouseEvent): void {
    const skipRectClick = this.isResizingRectangle || this.isMoveHandleDrag;
    if (!event) {
      this.rectEditClickDown = null;
    } else if (!skipRectClick && !this.draftElement) {
      this.finishRectTextEditClick(event.clientX, event.clientY);
    } else {
      this.rectEditClickDown = null;
    }

    if (this.draftElement) {
      const normalized = this.normalizeElement(this.draftElement);
      this.elements.push(normalized);
      this.selectedElementId = normalized.id;
    }

    this.isDrawing = false;
    this.isMoveHandleDrag = false;
    this.lastPointerWorld = null;
    this.isResizingRectangle = false;
    this.resizeHandle = null;
    this.resizeStartRect = null;
    this.dragStart = null;
    this.draftElement = null;
    this.render();
    this.persistSceneSnapshot();
  }

  private finishRectTextEditClick(clientX: number, clientY: number): void {
    if (!this.rectEditClickDown || this.activeTool !== 'select') {
      return;
    }
    const down = this.rectEditClickDown;
    this.rectEditClickDown = null;
    const d = Math.hypot(clientX - down.clientX, clientY - down.clientY);
    if (d >= 8) {
      return;
    }
    if (this.selectedElementId !== down.elementId) {
      return;
    }
    const el = this.elements.find((e) => e.id === down.elementId);
    if (el?.type !== 'rectangle') {
      return;
    }
    this.openRectangleTextEditor(down.elementId);
  }

  openRectangleTextEditor(id: string): void {
    if (this.overviewOpen) {
      return;
    }
    const r = this.elements.find((e) => e.id === id && e.type === 'rectangle') as RectElement | undefined;
    if (!r) {
      return;
    }
    this.editingRectangleId = id;
    this.rectEditorValue = r.innerText ?? '';
    this.cdr.markForCheck();
    setTimeout(() => {
      const ta = this.rectTextAreaRef?.nativeElement;
      ta?.focus({ preventScroll: true });
    }, 0);
  }

  closeRectangleTextEditor(): void {
    if (!this.editingRectangleId) {
      return;
    }
    const id = this.editingRectangleId;
    const r = this.elements.find((e) => e.id === id && e.type === 'rectangle') as RectElement | undefined;
    if (r) {
      r.innerText = this.rectEditorValue;
    }
    this.editingRectangleId = null;
    this.rectEditorValue = '';
    this.render();
    this.persistSceneSnapshot();
    this.cdr.markForCheck();
  }

  getRectangleTextEditorScreenRect(): { left: number; top: number; width: number; height: number } | null {
    if (!this.editingRectangleId) {
      return null;
    }
    const el = this.elements.find((e) => e.id === this.editingRectangleId && e.type === 'rectangle') as RectElement | undefined;
    if (!el) {
      return null;
    }
    const b = this.getElementBounds(el);
    const scr = this.worldRectToScreen(b);
    const pad = 6;
    return {
      left: scr.x + pad,
      top: scr.y + pad,
      width: Math.max(8, scr.width - pad * 2),
      height: Math.max(8, scr.height - pad * 2)
    };
  }

  clearCanvas(): void {
    this.elements = [];
    this.draftElement = null;
    this.selectedElementId = null;
    this.rectEditClickDown = null;
    this.editingRectangleId = null;
    this.rectEditorValue = '';
    this.render();
    this.persistSceneSnapshot();
  }

  zoomToSelected(): void {
    const selected = this.getSelectedElement();
    if (!selected) return;

    const bounds = this.getElementBounds(selected);
    const canvas = this.canvasRef.nativeElement;
    const margin = 80;
    const targetScale = Math.min(
      this.maxScale,
      Math.max(
        this.minScale,
        Math.min(
          (canvas.width - margin * 2) / Math.max(bounds.width, 1),
          (canvas.height - margin * 2) / Math.max(bounds.height, 1)
        )
      )
    );

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    this.scale = targetScale;
    this.panX = canvas.width / 2 - centerX * this.scale;
    this.panY = canvas.height / 2 - centerY * this.scale;
    this.render();
    this.persistSceneSnapshot();
  }

  startResizeFromHandle(handle: ResizeHandle, event: MouseEvent): void {
    event.stopPropagation();
    this.rectEditClickDown = null;
    const selected = this.getSelectedElement();
    if (!selected || selected.type !== 'rectangle') return;
    this.isResizingRectangle = true;
    this.resizeHandle = handle;
    this.resizeStartRect = { ...selected };
  }

  startMoveFromHandle(event: MouseEvent): void {
    event.stopPropagation();
    this.rectEditClickDown = null;
    if (!this.selectedElementId) return;
    this.isMoveHandleDrag = true;
    this.lastPointerWorld = this.screenToWorld(this.getCanvasPoint(event));
  }

  onCanvasWheel(event: WheelEvent): void {
    if (this.overviewOpen) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const canvasPoint = this.getCanvasPoint(event);
    const worldBefore = this.screenToWorld(canvasPoint);
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));
    this.panX = canvasPoint.x - worldBefore.x * this.scale;
    this.panY = canvasPoint.y - worldBefore.y * this.scale;
    this.render();
    this.persistSceneSnapshot();
  }

  onCanvasDoubleClick(event: MouseEvent): void {
    if (this.overviewOpen) {
      return;
    }
    if (this.editingRectangleId) {
      return;
    }
    const point = this.screenToWorld(this.getCanvasPoint(event));
    const hit = this.findElementAtPoint(point);
    if (!hit) return;
    this.selectedElementId = hit.id;
    const ids = hit.childSceneIds ?? [];
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i]!;
      if (this.canvasSceneStore.getScene(id)) {
        void this.router.navigate(['/constructeurs', 'canvas-board', id]);
        return;
      }
    }
    this.zoomToSelected();
  }

  getRectResizeHandleStyle(handle: ResizeHandle): ScreenPosition | null {
    const selected = this.getSelectedElement();
    if (!selected || selected.type !== 'rectangle') return null;

    const bounds = this.worldRectToScreen(this.getElementBounds(selected));
    const points: Record<ResizeHandle, Point> = {
      nw: { x: bounds.x, y: bounds.y },
      ne: { x: bounds.x + bounds.width, y: bounds.y },
      sw: { x: bounds.x, y: bounds.y + bounds.height },
      se: { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    };
    return { left: `${points[handle].x}px`, top: `${points[handle].y}px` };
  }

  getMoveHandleStyle(): ScreenPosition | null {
    const selected = this.getSelectedElement();
    if (!selected) return null;
    const bounds = this.worldRectToScreen(this.getElementBounds(selected));
    return {
      left: `${bounds.x + bounds.width / 2}px`,
      top: `${bounds.y - 18}px`
    };
  }

  deleteSelectedElement(): void {
    if (!this.selectedElementId) return;
    const removedId = this.selectedElementId;
    if (this.editingRectangleId === removedId) {
      this.editingRectangleId = null;
      this.rectEditorValue = '';
    }
    this.elements = this.elements.filter((el) => el.id !== removedId);
    for (const e of this.elements) {
      if (e.type !== 'arrow') continue;
      if (e.startAttach?.elementId === removedId) {
        delete e.startAttach;
      }
      if (e.endAttach?.elementId === removedId) {
        delete e.endAttach;
      }
    }
    this.selectedElementId = null;
    this.render();
    this.persistSceneSnapshot();
  }

  toggleOverview(): void {
    this.rectEditClickDown = null;
    this.closeRectangleTextEditor();
    const scroll = this.getCanvasScrollEl();
    const canvas = this.canvasRef.nativeElement;
    if (!this.overviewOpen) {
      this.savedOverviewView = { scale: this.scale, panX: this.panX, panY: this.panY };
      this.savedExtendedBitmap = { w: canvas.width, h: canvas.height };
      if (scroll) {
        this.savedOverviewScroll = { left: scroll.scrollLeft, top: scroll.scrollTop };
        scroll.scrollLeft = 0;
        scroll.scrollTop = 0;
      }
      this.scale = 1;
      this.panX = 0;
      this.panY = 0;
      canvas.width = this.baseCanvasWidth;
      canvas.height = this.baseCanvasHeight;
      this.overviewOpen = true;
    } else {
      this.overviewOpen = false;
      if (this.savedExtendedBitmap) {
        canvas.width = this.savedExtendedBitmap.w;
        canvas.height = this.savedExtendedBitmap.h;
        this.savedExtendedBitmap = null;
      }
      this.scale = this.savedOverviewView.scale;
      this.panX = this.savedOverviewView.panX;
      this.panY = this.savedOverviewView.panY;
      if (scroll) {
        scroll.scrollLeft = this.savedOverviewScroll.left;
        scroll.scrollTop = this.savedOverviewScroll.top;
      }
    }
    this.syncCanvasCssSize();
    this.render();
    this.cdr.detectChanges();
    this.persistSceneSnapshot();
  }

  onCanvasScroll(): void {}

  goToParentScene(): void {
    const id = this.activeSceneId;
    if (!id) return;
    const node = this.canvasSceneStore.getScene(id);
    if (!node?.parentSceneId) return;
    void this.router.navigate(['/constructeurs', 'canvas-board', node.parentSceneId]);
  }

  /** Open the first linked sub-scene for the selected shape (same ids as in the store). */
  goToLinkedChildScene(): void {
    const childId = this.linkedChildSceneIdToOpen;
    if (!childId) return;
    void this.router.navigate(['/constructeurs', 'canvas-board', childId]);
  }

  get canGoToParentScene(): boolean {
    const id = this.activeSceneId;
    if (!id) return false;
    return !!this.canvasSceneStore.getScene(id)?.parentSceneId;
  }

  get canCreateChildScene(): boolean {
    return !this.overviewOpen && !!this.activeSceneId && !!this.selectedElementId;
  }

  /** Last linked child scene id that still exists (newest appended id wins). */
  get linkedChildSceneIdToOpen(): string | null {
    const el = this.getSelectedElement();
    if (!el?.childSceneIds?.length) return null;
    for (let i = el.childSceneIds.length - 1; i >= 0; i--) {
      const id = el.childSceneIds[i]!;
      if (this.canvasSceneStore.getScene(id)) return id;
    }
    return null;
  }

  get canOpenChildScene(): boolean {
    return !this.overviewOpen && !!this.activeSceneId && !!this.linkedChildSceneIdToOpen;
  }

  async openCreateChildSceneDialog(): Promise<void> {
    if (this.overviewOpen || !this.activeSceneId) return;
    const selected = this.getSelectedElement();
    if (!selected) return;
    const preview = this.canvasSceneStore.previewNextOutlineNumber(this.activeSceneId);
    const ref = this.dialog.open(CreateChildSceneDialogComponent, {
      width: '380px',
      disableClose: true,
      data: { previewOutlineNumber: preview }
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (!result?.title) return;
    const parentId = this.activeSceneId;
    const parentNode = this.canvasSceneStore.getScene(parentId);
    const b = this.getElementBounds(this.normalizeElement(selected));
    const parentFrame: ParentFrame = {
      parentSceneId: parentId,
      parentElementId: selected.id,
      parentSceneTitle: parentNode?.title,
      rect: { x: b.x, y: b.y, width: b.width, height: b.height }
    };
    const created = this.canvasSceneStore.createChildScene({
      parentSceneId: parentId,
      parentElementId: selected.id,
      title: result.title,
      parentFrame
    });
    const updatedParent = this.canvasSceneStore.getScene(parentId);
    this.elements = normalizeCanvasElements(updatedParent?.innerDocument.elements ?? this.elements);
    this.persistSceneSnapshot();
    void this.router.navigate(['/constructeurs', 'canvas-board', created.id]);
  }

  private applySceneFromStore(sceneId: string): void {
    const node = this.canvasSceneStore.getScene(sceneId);
    if (!node) return;
    const d = node.innerDocument;
    this.elements = normalizeCanvasElements(d.elements);
    this.baseCanvasWidth = d.baseCanvasWidth || 0;
    this.baseCanvasHeight = d.baseCanvasHeight || 0;
    this.extraLeft = d.extraLeft || 0;
    this.extraRight = d.extraRight || 0;
    this.extraTop = d.extraTop || 0;
    this.extraBottom = d.extraBottom || 0;
    this.scale = d.scale > 0 ? d.scale : 1;
    this.panX = d.panX ?? 0;
    this.panY = d.panY ?? 0;
    const canvas = this.canvasRef.nativeElement;
    if (d.sheetWidth > 0 && d.sheetHeight > 0) {
      canvas.width = d.sheetWidth;
      canvas.height = d.sheetHeight;
    }
    this.selectedElementId = null;
    this.draftElement = null;
    this.rectEditClickDown = null;
    this.editingRectangleId = null;
    this.rectEditorValue = '';
  }

  private persistSceneSnapshot(): void {
    const id = this.activeSceneId;
    if (!id || !this.canvasRef?.nativeElement) return;
    const c = this.canvasRef.nativeElement;
    this.canvasSceneStore.patchSceneInnerDocument(id, {
      elements: structuredClone(this.elements),
      sheetWidth: c.width,
      sheetHeight: c.height,
      baseCanvasWidth: this.baseCanvasWidth,
      baseCanvasHeight: this.baseCanvasHeight,
      extraLeft: this.extraLeft,
      extraRight: this.extraRight,
      extraTop: this.extraTop,
      extraBottom: this.extraBottom,
      scale: this.scale,
      panX: this.panX,
      panY: this.panY
    });
  }

  private updateParentPortalOverlay(): void {
    if (this.overviewOpen) {
      this.parentPortalBoxStyle = null;
      return;
    }
    const node = this.activeSceneId ? this.canvasSceneStore.getScene(this.activeSceneId) : undefined;
    const pf = node?.parentFrame;
    const host = this.canvasContainerRef?.nativeElement;
    if (!pf || !host) {
      this.parentPortalBoxStyle = null;
      return;
    }
    const pad = 10;
    const w = Math.max(1, host.clientWidth - pad * 2);
    const h = Math.max(1, host.clientHeight - pad * 2);
    const rw = Math.max(1, pf.rect.width);
    const rh = Math.max(1, pf.rect.height);
    const s = Math.min(w / rw, h / rh);
    const bw = rw * s;
    const bh = rh * s;
    const left = pad + (w - bw) / 2;
    const top = pad + (h - bh) / 2;
    this.parentPortalBoxStyle = {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${bw}px`,
      height: `${bh}px`,
      border: '3px dashed #2563eb',
      borderRadius: '8px',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      zIndex: '6'
    };
  }

  goBack(): void {
    this.router.navigate(['/constructeurs']);
  }

  onArrowDecorKindChange(e: MatButtonToggleChange): void {
    const v = e.value;
    if (v === 'circle' || v === 'rectangle') {
      this.arrowDecorationKind = v;
    }
  }

  /** Maj+Entrée: nouvelle forme séparée + attache `endAttach` sur la flèche sélectionnée. */
  addOrReplaceArrowEndDecoration(): void {
    if (this.overviewOpen) return;
    const sel = this.getSelectedElement();
    if (!sel || sel.type !== 'arrow') return;
    if (sel.endAttach) {
      this.elements = this.elements.filter((e) => e.id !== sel.endAttach!.elementId);
    }
    const ux = sel.end.x - sel.start.x;
    const uy = sel.end.y - sel.start.y;
    const len = Math.hypot(ux, uy) || 1;
    const px = ux / len;
    const py = uy / len;
    const qx = -py;
    const qy = px;
    const off = 26;
    const cx = sel.end.x + qx * off + px * 10;
    const cy = sel.end.y + qy * off + py * 10;
    const tid = crypto.randomUUID();
    const tailEl: CanvasElement =
      this.arrowDecorationKind === 'circle'
        ? { id: tid, type: 'circle', cx, cy, r: 14, childSceneIds: [] }
        : {
            id: tid,
            type: 'rectangle',
            x: cx - 22,
            y: cy - 14,
            width: 44,
            height: 28,
            innerText: '',
            childSceneIds: []
          };
    sel.endAttach = { elementId: tid };
    delete sel.endDecoration;
    this.elements.push(tailEl);
    this.syncAttachedArrows();
    this.selectedElementId = tid;
    this.render();
    this.persistSceneSnapshot();
  }

  /** Maj+Entrée avec rectangle / texte / cercle sélectionné : nouvelle flèche liée + forme séparée. */
  private createArrowWithDecorationFromSource(source: CanvasElement): void {
    if (this.overviewOpen) return;
    const b = this.getElementBounds(this.normalizeElement(source));
    const useHorizontal = b.width >= b.height;
    const start: Point = useHorizontal
      ? { x: b.x + b.width, y: b.y + b.height / 2 }
      : { x: b.x + b.width / 2, y: b.y + b.height };
    const dir = useHorizontal ? { x: 1, y: 0 } : { x: 0, y: 1 };
    const seg = 88;
    const endPre = { x: start.x + dir.x * seg, y: start.y + dir.y * seg };
    const qx = -dir.y;
    const qy = dir.x;
    const off = 26;
    const cx = endPre.x + qx * off + dir.x * 10;
    const cy = endPre.y + qy * off + dir.y * 10;
    const tailId = crypto.randomUUID();
    const arrowId = crypto.randomUUID();
    const arrow: ArrowElement = {
      id: arrowId,
      type: 'arrow',
      start: { ...start },
      end: { ...endPre },
      childSceneIds: [],
      startAttach: { elementId: source.id },
      endAttach: { elementId: tailId }
    };
    const tailEl: CanvasElement =
      this.arrowDecorationKind === 'circle'
        ? { id: tailId, type: 'circle', cx, cy, r: 14, childSceneIds: [] }
        : {
            id: tailId,
            type: 'rectangle',
            x: cx - 22,
            y: cy - 14,
            width: 44,
            height: 28,
            innerText: '',
            childSceneIds: []
          };
    this.elements.push(arrow, tailEl);
    this.syncAttachedArrows();
    this.selectedElementId = tailId;
    this.render();
    this.persistSceneSnapshot();
  }

  /** Met à jour `start` / `end` des flèches liées aux figures (éléments séparés). */
  private syncAttachedArrows(): void {
    const byId = new Map(this.elements.map((e) => [e.id, e]));
    for (const el of this.elements) {
      if (el.type !== 'arrow') continue;
      const a = el;
      if (a.startAttach) {
        const src = byId.get(a.startAttach.elementId);
        const p = this.anchorOutgoingFromElement(src);
        if (p) {
          a.start = p;
        }
      }
      if (a.endAttach) {
        const tail = byId.get(a.endAttach.elementId);
        if (tail?.type === 'rectangle') {
          const r = this.normalizeElement(tail) as RectElement;
          a.end = tipOnRectWorld(a.start, { x: r.x, y: r.y, width: r.width, height: r.height });
        } else if (tail?.type === 'circle') {
          a.end = tipOnCircleWorld(a.start, tail.cx, tail.cy, tail.r);
        }
      }
    }
  }

  private anchorOutgoingFromElement(src: CanvasElement | undefined): Point | null {
    if (!src) return null;
    if (src.type === 'rectangle') {
      const r = this.normalizeElement(src) as RectElement;
      const bx = r.x;
      const by = r.y;
      const bw = r.width;
      const bh = r.height;
      const useH = bw >= bh;
      return useH ? { x: bx + bw, y: by + bh / 2 } : { x: bx + bw / 2, y: by + bh };
    }
    if (src.type === 'text') {
      const b = this.getElementBounds(src);
      const useH = b.width >= b.height;
      return useH ? { x: b.x + b.width, y: b.y + b.height / 2 } : { x: b.x + b.width / 2, y: b.y + b.height };
    }
    if (src.type === 'circle') {
      const b = { x: src.cx - src.r, y: src.cy - src.r, width: 2 * src.r, height: 2 * src.r };
      const useH = b.width >= b.height;
      return useH ? { x: b.x + b.width, y: b.y + b.height / 2 } : { x: b.x + b.width / 2, y: b.y + b.height };
    }
    return null;
  }

  private effectiveArrowTip(a: ArrowElement): Point {
    return a.end;
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = this.canvasContainerRef.nativeElement;
    if (!container) return;

    if (this.overviewOpen) {
      this.updateOverviewLayout();
      return;
    }

    const { w: newWidth, h: newHeight } = this.getScrollAreaSize();

    if (this.baseCanvasWidth === 0 || this.baseCanvasHeight === 0) {
      canvas.width = Math.max(320, newWidth);
      canvas.height = Math.max(320, newHeight);
      this.baseCanvasWidth = canvas.width;
      this.baseCanvasHeight = canvas.height;
      this.horizontalPercentLabel = '100%';
      this.verticalPercentLabel = '100%';
    } else {
      if (canvas.width < newWidth) {
        canvas.width = newWidth;
      }
      if (canvas.height < newHeight) {
        canvas.height = Math.max(canvas.height, newHeight);
      }
    }

    this.syncCanvasCssSize();
  }

  private getScrollAreaSize(): { w: number; h: number } {
    const container = this.canvasContainerRef.nativeElement;
    const scroll =
      this.canvasScrollRef?.nativeElement ?? (container.querySelector('.canvas-scroll') as HTMLElement | null);
    const wRaw = scroll?.clientWidth ?? container.clientWidth;
    const hRaw = scroll?.clientHeight ?? container.clientHeight;
    return { w: Math.max(0, Math.floor(wRaw)), h: Math.max(0, Math.floor(hRaw)) };
  }

  private syncCanvasCssSize(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    if (this.surfaceRef?.nativeElement) {
      this.surfaceRef.nativeElement.style.width = `${canvas.width}px`;
      this.surfaceRef.nativeElement.style.height = `${canvas.height}px`;
    }
  }

  private getCanvasPointFromClient(clientX: number, clientY: number): Point {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const rx = rect.width > 0 ? canvas.width / rect.width : 1;
    const ry = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * rx,
      y: (clientY - rect.top) * ry
    };
  }

  private getCanvasPoint(event: MouseEvent | WheelEvent): Point {
    return this.getCanvasPointFromClient(event.clientX, event.clientY);
  }

  private screenToWorld(point: Point): Point {
    return {
      x: (point.x - this.panX) / this.scale,
      y: (point.y - this.panY) / this.scale
    };
  }

  private worldToScreen(point: Point): Point {
    return {
      x: point.x * this.scale + this.panX,
      y: point.y * this.scale + this.panY
    };
  }

  private normalizeElement(element: CanvasElement): CanvasElement {
    if (element.type !== 'rectangle') {
      return element;
    }

    const x = element.width < 0 ? element.x + element.width : element.x;
    const y = element.height < 0 ? element.y + element.height : element.y;
    const width = Math.abs(element.width);
    const height = Math.abs(element.height);

    return { ...element, x, y, width, height };
  }

  private render(): void {
    if (!this.ctx) return;
    if (!this.overviewOpen) {
      this.syncAttachedArrows();
      this.ensureCanvasFitsContent();
    }
    this.updateAxisLabels();

    const canvas = this.canvasRef.nativeElement;
    if (this.overviewOpen) {
      this.renderOverviewHolst();
    } else {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);

      this.ctx.save();
      this.ctx.setTransform(this.scale, 0, 0, this.scale, this.panX, this.panY);

      for (const element of this.elements) {
        this.drawElement(element);
      }

      if (this.draftElement) {
        this.drawElement(this.normalizeElement(this.draftElement), true);
      }

      this.drawSelectedOutline();
      this.ctx.restore();
    }
    this.syncCanvasCssSize();
    if (this.overviewOpen) {
      this.updateOverviewLayout();
    }
    this.updateParentPortalOverlay();
    this.scheduleScrollOverflowUpdate();
    if (this.editingRectangleId) {
      this.cdr.markForCheck();
    }
  }

  private scheduleScrollOverflowUpdate(): void {
    if (this.overviewOpen) {
      if (this.scrollMode !== 'none') {
        this.scrollMode = 'none';
        this.cdr.markForCheck();
      }
      return;
    }
    requestAnimationFrame(() => {
      this.updateScrollOverflowMode();
      this.cdr.markForCheck();
      requestAnimationFrame(() => {
        this.updateScrollOverflowMode();
        this.cdr.markForCheck();
      });
    });
  }

  private updateScrollOverflowMode(): void {
    const scroll = this.getCanvasScrollEl();
    if (!scroll || this.overviewOpen) {
      this.scrollMode = 'none';
      return;
    }
    const cw = scroll.clientWidth;
    const ch = scroll.clientHeight;
    const sw = scroll.scrollWidth;
    const sh = scroll.scrollHeight;
    const eps = 2;
    const needX = sw > cw + eps;
    const needY = sh > ch + eps;
    if (needX && needY) {
      this.scrollMode = 'xy';
    } else if (needX) {
      this.scrollMode = 'x';
    } else if (needY) {
      this.scrollMode = 'y';
    } else {
      this.scrollMode = 'none';
    }
  }

  private getCanvasScrollEl(): HTMLElement | null {
    return (
      this.canvasScrollRef?.nativeElement ??
      (this.canvasContainerRef?.nativeElement?.querySelector('.canvas-scroll') as HTMLElement | null)
    );
  }

  private updateOverviewLayout(): void {
    const scroll = this.getCanvasScrollEl();
    const cw = this.baseCanvasWidth;
    const ch = this.baseCanvasHeight;
    if (!scroll || cw < 1 || ch < 1) {
      return;
    }
    const pad = 12;
    const aw = Math.max(1, scroll.clientWidth - pad * 2);
    const ah = Math.max(1, scroll.clientHeight - pad * 2);
    const s = Math.min(aw / cw, ah / ch);
    this.overviewFitScale = s;
    this.overviewOuterW = cw * s;
    this.overviewOuterH = ch * s;
  }

  /** Vue d'ensemble: fixed holst bitmap (base size); elements drawn smaller/displaced from world coords. */
  private renderOverviewHolst(): void {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.width;
    const h = canvas.height;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 6]);
    this.ctx.strokeRect(2, 2, w - 4, h - 4);
    this.ctx.setLineDash([]);

    const pad = 6;
    for (const element of this.elements) {
      this.drawElementOverview(element, false, pad);
    }
    if (this.draftElement) {
      this.drawElementOverview(this.normalizeElement(this.draftElement), true, pad);
    }
    this.drawSelectedOutlineOverview(pad);
  }

  private drawElementOverview(element: CanvasElement, isDraft: boolean, pad: number): void {
    if (!this.ctx) return;
    const norm = this.normalizeElement(element);
    const wb = this.getElementBounds(norm);

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = isDraft ? '#64748b' : '#2563eb';
    this.ctx.fillStyle = '#0f172a';
    this.ctx.setLineDash(isDraft ? [6, 4] : []);

    if (element.type === 'rectangle') {
      const r = this.getOverviewPreviewRect(wb, pad);
      this.ctx.strokeRect(r.x, r.y, r.w, r.h);
    } else if (element.type === 'circle') {
      const r = this.getOverviewPreviewRect(wb, pad);
      const rr = Math.min(r.w, r.h) / 2;
      this.ctx.beginPath();
      this.ctx.arc(r.x + r.w / 2, r.y + r.h / 2, rr, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (element.type === 'arrow') {
      const p1 = this.worldPointToOverviewPreview(element.start, pad);
      const tip = this.effectiveArrowTip(element);
      const p2 = this.worldPointToOverviewPreview(tip, pad);
      this.drawArrowOverview(p1, p2);
    } else {
      const r = this.getOverviewPreviewRect(wb, pad);
      this.ctx.font = `${Math.max(10, Math.round(16 * (r.w / Math.max(wb.width, 1))))}px Inter, sans-serif`;
      this.ctx.fillText(element.text, r.x, r.y + r.h * 0.85);
    }

    this.ctx.restore();
  }

  private drawArrowOverview(start: Point, end: Point): void {
    if (!this.ctx) return;
    const headLength = 10;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  private drawSelectedOutlineOverview(pad: number): void {
    const selected = this.getSelectedElement();
    if (!selected || !this.ctx) return;
    const wb = this.getElementBounds(selected);
    const r = this.getOverviewPreviewRect(wb, pad);
    this.ctx.save();
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    this.ctx.restore();
  }

  private getOverviewPreviewRect(
    wb: { x: number; y: number; width: number; height: number },
    pad: number
  ): { x: number; y: number; w: number; h: number } {
    const { xPct, yPct } = this.computeAxisPercentRawForRect(wb);
    const sVis = this.overviewVisualScaleFromPercents(xPct, yPct);
    const cx = wb.x + wb.width / 2;
    const cy = wb.y + wb.height / 2;
    const pc = this.worldCenterToOverviewPreview(cx, cy, pad);
    const prw = wb.width * sVis;
    const prh = wb.height * sVis;
    let x = pc.x - prw / 2;
    let y = pc.y - prh / 2;
    const hw = this.baseCanvasWidth;
    const hh = this.baseCanvasHeight;
    x = Math.max(pad, Math.min(hw - pad - prw, x));
    y = Math.max(pad, Math.min(hh - pad - prh, y));
    return { x, y, w: Math.max(1, prw), h: Math.max(1, prh) };
  }

  private overviewVisualScaleFromPercents(xPct: number, yPct: number): number {
    const sx = xPct >= 100 ? 100 / xPct : 1;
    const sy = yPct >= 100 ? 100 / yPct : 1;
    return Math.min(1, sx, sy);
  }

  private worldCenterToOverviewPreview(cx: number, cy: number, pad: number): Point {
    const hw = this.baseCanvasWidth;
    const hh = this.baseCanvasHeight;
    const L = 0;
    const R = hw;
    const T = 0;
    const B = hh;
    const hcx = (L + R) / 2;
    const hcy = (T + B) / 2;
    const k = 0.42;
    let px = hw / 2 + (cx - hcx) * k;
    let py = hh / 2 + (cy - hcy) * k;
    px = Math.max(pad, Math.min(hw - pad, px));
    py = Math.max(pad, Math.min(hh - pad, py));
    return { x: px, y: py };
  }

  private worldPointToOverviewPreview(p: Point, pad: number): Point {
    return this.worldCenterToOverviewPreview(p.x, p.y, pad);
  }

  /** Axis % in world space vs holst (same numbers as labels); not rounded — used for overview scale. */
  private computeAxisPercentRawForRect(wb: { x: number; y: number; width: number; height: number }): {
    xPct: number;
    yPct: number;
  } {
    /** Reference holst: initial size anchored at world (0,0); never shifts when the sheet grows. */
    const L = 0;
    const R = this.baseCanvasWidth;
    const T = 0;
    const B = this.baseCanvasHeight;
    const sl = wb.x;
    const sr = wb.x + wb.width;
    const st = wb.y;
    const sb = wb.y + wb.height;

    let xPct = 100;
    const insideX = sl >= L && sr <= R;
    if (!insideX) {
      const overR = Math.max(0, sr - R);
      const overL = Math.max(0, L - sl);
      if (overR > 0 && overL > 0) {
        xPct = 100 + ((overR - overL) / this.baseCanvasWidth) * 100;
      } else if (overR > 0) {
        xPct = 100 + (overR / this.baseCanvasWidth) * 100;
      } else {
        xPct = 100 - (overL / this.baseCanvasWidth) * 100;
      }
    }

    let yPct = 100;
    const insideY = st >= T && sb <= B;
    if (!insideY) {
      const overB = Math.max(0, sb - B);
      const overT = Math.max(0, T - st);
      if (overB > 0 && overT > 0) {
        yPct = 100 + ((overB - overT) / this.baseCanvasHeight) * 100;
      } else if (overB > 0) {
        yPct = 100 + (overB / this.baseCanvasHeight) * 100;
      } else {
        yPct = 100 - (overT / this.baseCanvasHeight) * 100;
      }
    }

    return { xPct, yPct };
  }

  private wrapRectTextLines(text: string, maxWidth: number): string[] {
    if (!this.ctx || maxWidth < 4) {
      return [];
    }
    const paragraphs = text.split(/\r?\n/);
    const out: string[] = [];
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push('');
        continue;
      }
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (this.ctx.measureText(test).width <= maxWidth) {
          line = test;
        } else {
          if (line) {
            out.push(line);
          }
          if (this.ctx.measureText(w).width <= maxWidth) {
            line = w;
          } else {
            let chunk = '';
            for (const ch of w) {
              const t2 = chunk + ch;
              if (this.ctx.measureText(t2).width <= maxWidth) {
                chunk = t2;
              } else {
                if (chunk) {
                  out.push(chunk);
                }
                chunk = ch;
              }
            }
            line = chunk;
          }
        }
      }
      if (line) {
        out.push(line);
      }
    }
    return out;
  }

  private drawRectangleInnerText(r: RectElement): void {
    if (!this.ctx) {
      return;
    }
    if (this.editingRectangleId === r.id) {
      return;
    }
    const raw = r.innerText ?? '';
    if (!raw.trim()) {
      return;
    }

    const pad = 6;
    const x = r.x + pad;
    const y = r.y + pad;
    const maxW = Math.max(1, r.width - pad * 2);
    const maxH = Math.max(1, r.height - pad * 2);
    const fontPx = 14;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(r.x, r.y, r.width, r.height);
    this.ctx.clip();
    this.ctx.font = `${fontPx}px Inter, sans-serif`;
    this.ctx.fillStyle = '#0f172a';
    this.ctx.textBaseline = 'top';

    const lines = this.wrapRectTextLines(raw, maxW);
    let lineY = y;
    const lineHeight = fontPx * 1.28;
    const bottom = r.y + r.height - pad;
    for (const line of lines) {
      if (lineY + lineHeight > bottom) {
        break;
      }
      this.ctx.fillText(line, x, lineY);
      lineY += lineHeight;
    }
    this.ctx.restore();
  }

  private drawElement(element: CanvasElement, isDraft = false): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = isDraft ? '#64748b' : '#2563eb';
    this.ctx.fillStyle = '#0f172a';
    this.ctx.setLineDash(isDraft ? [6, 4] : []);

    if (element.type === 'rectangle') {
      const norm = this.normalizeElement(element) as RectElement;
      this.ctx.strokeRect(norm.x, norm.y, norm.width, norm.height);
      this.drawRectangleInnerText(norm);
    } else if (element.type === 'circle') {
      this.ctx.beginPath();
      this.ctx.arc(element.cx, element.cy, element.r, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (element.type === 'arrow') {
      this.drawArrow(element.start, this.effectiveArrowTip(element));
    } else {
      this.ctx.font = '16px Inter, sans-serif';
      this.ctx.fillText(element.text, element.x, element.y);
    }

    this.ctx.restore();
  }

  private drawSelectedOutline(): void {
    const selected = this.getSelectedElement();
    if (!selected || !this.ctx) return;
    const bounds = this.getElementBounds(selected);
    this.ctx.save();
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 1.5 / this.scale;
    this.ctx.setLineDash([6 / this.scale, 4 / this.scale]);
    this.ctx.strokeRect(bounds.x - 4 / this.scale, bounds.y - 4 / this.scale, bounds.width + 8 / this.scale, bounds.height + 8 / this.scale);
    this.ctx.restore();
  }

  private translateSelected(dx: number, dy: number): void {
    if (!this.selectedElementId) return;
    const selected = this.getSelectedElement();
    if (!selected) return;

    if (selected.type === 'rectangle') {
      selected.x += dx;
      selected.y += dy;
      return;
    }

    if (selected.type === 'circle') {
      selected.cx += dx;
      selected.cy += dy;
      return;
    }

    if (selected.type === 'arrow') {
      if (selected.startAttach || selected.endAttach) {
        delete selected.startAttach;
        delete selected.endAttach;
      }
      selected.start.x += dx;
      selected.start.y += dy;
      selected.end.x += dx;
      selected.end.y += dy;
      return;
    }

    selected.x += dx;
    selected.y += dy;
  }

  private ensureCanvasFitsContent(): void {
    if (this.overviewOpen) return;
    const canvas = this.canvasRef.nativeElement;
    const scrollHost = this.getCanvasScrollEl();
    const allElements = this.draftElement
      ? [...this.elements, this.normalizeElement(this.draftElement)]
      : [...this.elements];
    if (!allElements.length) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const element of allElements) {
      const world = this.getElementBounds(this.normalizeElement(element));
      minX = Math.min(minX, world.x);
      minY = Math.min(minY, world.y);
      maxX = Math.max(maxX, world.x + world.width);
      maxY = Math.max(maxY, world.y + world.height);
    }

    /** Only extend the sheet when content crosses the current allocated world rect (base + extras, or current bitmap if wider after resize). */
    const edgePad = 4;
    const allocLeft = -this.extraLeft;
    const allocTop = -this.extraTop;
    const allocRight = Math.max(this.baseCanvasWidth + this.extraRight, canvas.width);
    const allocBottom = Math.max(this.baseCanvasHeight + this.extraBottom, canvas.height);

    const growLeft = minX < allocLeft - edgePad ? Math.ceil(allocLeft - edgePad - minX) : 0;
    const growTop = minY < allocTop - edgePad ? Math.ceil(allocTop - edgePad - minY) : 0;
    const growRight = maxX > allocRight + edgePad ? Math.ceil(maxX - allocRight + edgePad) : 0;
    const growBottom = maxY > allocBottom + edgePad ? Math.ceil(maxY - allocBottom + edgePad) : 0;

    const maxExtraLeft = (Math.abs(this.minPercent) / 100) * this.baseCanvasWidth;
    const maxExtraTop = (Math.abs(this.minPercent) / 100) * this.baseCanvasHeight;
    const maxExtraRight = ((this.maxPercent - 100) / 100) * this.baseCanvasWidth;
    const maxExtraBottom = ((this.maxPercent - 100) / 100) * this.baseCanvasHeight;

    const allowedGrowLeft = Math.max(0, Math.min(growLeft, maxExtraLeft - this.extraLeft));
    const allowedGrowTop = Math.max(0, Math.min(growTop, maxExtraTop - this.extraTop));
    const allowedGrowRight = Math.max(0, Math.min(growRight, maxExtraRight - this.extraRight));
    const allowedGrowBottom = Math.max(0, Math.min(growBottom, maxExtraBottom - this.extraBottom));

    if (!allowedGrowLeft && !allowedGrowTop && !allowedGrowRight && !allowedGrowBottom) return;

    const newWidth = canvas.width + allowedGrowLeft + allowedGrowRight;
    const newHeight = canvas.height + allowedGrowTop + allowedGrowBottom;
    canvas.width = newWidth;
    canvas.height = newHeight;

    if (allowedGrowLeft || allowedGrowTop) {
      this.panX += allowedGrowLeft;
      this.panY += allowedGrowTop;
      if (scrollHost) {
        scrollHost.scrollLeft += allowedGrowLeft;
        scrollHost.scrollTop += allowedGrowTop;
      }
    }

    this.extraLeft += allowedGrowLeft;
    this.extraTop += allowedGrowTop;
    this.extraRight += allowedGrowRight;
    this.extraBottom += allowedGrowBottom;
    this.persistSceneSnapshot();
  }

  private updateAxisLabels(): void {
    if (!this.baseCanvasWidth || !this.baseCanvasHeight) return;

    const bounds = this.getWorldBoundsForLabels();
    if (!bounds) {
      this.horizontalPercentLabel = '100%';
      this.verticalPercentLabel = '100%';
      return;
    }

    const { xPct, yPct } = this.computeAxisPercentRawForRect(bounds);
    const xClamped = Math.round(Math.max(this.minPercent, Math.min(this.maxPercent, xPct)));
    const yClamped = Math.round(Math.max(this.minPercent, Math.min(this.maxPercent, yPct)));

    this.horizontalPercentLabel = `${xClamped}%`;
    this.verticalPercentLabel = `${yClamped}%`;
  }

  private getWorldBoundsForLabels(): { x: number; y: number; width: number; height: number } | null {
    const selected = this.getSelectedElement();
    if (selected) {
      return this.getElementBounds(selected);
    }
    return this.getAllElementsWorldBounds();
  }

  private getAllElementsWorldBounds(): { x: number; y: number; width: number; height: number } | null {
    const source = this.elements.length ? this.elements : this.draftElement ? [this.draftElement] : [];
    if (!source.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const element of source) {
      const world = this.getElementBounds(this.normalizeElement(element));
      minX = Math.min(minX, world.x);
      minY = Math.min(minY, world.y);
      maxX = Math.max(maxX, world.x + world.width);
      maxY = Math.max(maxY, world.y + world.height);
    }

    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  private applyRectangleResize(point: Point): void {
    if (!this.resizeHandle || !this.resizeStartRect || !this.selectedElementId) return;
    const current = this.getSelectedElement();
    if (!current || current.type !== 'rectangle') return;

    const start = this.resizeStartRect;
    const x1 = start.x;
    const y1 = start.y;
    const x2 = start.x + start.width;
    const y2 = start.y + start.height;

    let left = x1;
    let right = x2;
    let top = y1;
    let bottom = y2;

    if (this.resizeHandle.includes('w')) left = point.x;
    if (this.resizeHandle.includes('e')) right = point.x;
    if (this.resizeHandle.includes('n')) top = point.y;
    if (this.resizeHandle.includes('s')) bottom = point.y;

    const minSize = 2;
    if (Math.abs(right - left) < minSize) {
      if (this.resizeHandle.includes('w')) left = right - minSize;
      else right = left + minSize;
    }
    if (Math.abs(bottom - top) < minSize) {
      if (this.resizeHandle.includes('n')) top = bottom - minSize;
      else bottom = top + minSize;
    }

    current.x = Math.min(left, right);
    current.y = Math.min(top, bottom);
    current.width = Math.abs(right - left);
    current.height = Math.abs(bottom - top);
  }

  private drawArrow(start: Point, end: Point): void {
    if (!this.ctx) return;

    const headLength = 12;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  private getSelectedElement(): CanvasElement | null {
    if (!this.selectedElementId) return null;
    return this.elements.find((el) => el.id === this.selectedElementId) ?? null;
  }

  private findElementAtPoint(point: Point): CanvasElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const element = this.elements[i];
      if (this.isPointInsideElement(point, element)) {
        return element;
      }
    }
    return null;
  }

  private isPointInsideElement(point: Point, element: CanvasElement): boolean {
    const tolerance = 8 / this.scale;
    if (element.type === 'rectangle') {
      const b = this.getElementBounds(element);
      return (
        point.x >= b.x - tolerance &&
        point.x <= b.x + b.width + tolerance &&
        point.y >= b.y - tolerance &&
        point.y <= b.y + b.height + tolerance
      );
    }

    if (element.type === 'text') {
      const bounds = this.getElementBounds(element);
      return (
        point.x >= bounds.x - tolerance &&
        point.x <= bounds.x + bounds.width + tolerance &&
        point.y >= bounds.y - tolerance &&
        point.y <= bounds.y + bounds.height + tolerance
      );
    }

    if (element.type === 'circle') {
      return Math.hypot(point.x - element.cx, point.y - element.cy) <= element.r + tolerance;
    }

    if (element.type === 'arrow') {
      const tip = this.effectiveArrowTip(element);
      return this.distanceToSegment(point, element.start, tip) <= tolerance;
    }

    return false;
  }

  private distanceToSegment(point: Point, start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
    const projection = { x: start.x + t * dx, y: start.y + t * dy };
    return Math.hypot(point.x - projection.x, point.y - projection.y);
  }

  private getElementBounds(element: CanvasElement): { x: number; y: number; width: number; height: number } {
    if (element.type === 'rectangle') {
      const n = this.normalizeElement(element) as RectElement;
      return { x: n.x, y: n.y, width: n.width, height: n.height };
    }

    if (element.type === 'circle') {
      const d = 2 * element.r;
      return { x: element.cx - element.r, y: element.cy - element.r, width: Math.max(d, 1), height: Math.max(d, 1) };
    }

    if (element.type === 'arrow') {
      const tip = this.effectiveArrowTip(element);
      const minX = Math.min(element.start.x, tip.x);
      const minY = Math.min(element.start.y, tip.y);
      const maxX = Math.max(element.start.x, tip.x);
      const maxY = Math.max(element.start.y, tip.y);
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY)
      };
    }

    const width = Math.max(50, element.text.length * 8);
    const height = 20;
    return { x: element.x, y: element.y - height, width, height };
  }

  private worldRectToScreen(bounds: { x: number; y: number; width: number; height: number }): { x: number; y: number; width: number; height: number } {
    const topLeft = this.worldToScreen({ x: bounds.x, y: bounds.y });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bounds.width * this.scale,
      height: bounds.height * this.scale
    };
  }
}
