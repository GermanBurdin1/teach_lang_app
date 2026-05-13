import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LayoutModule } from '../../../layout/layout.module';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type CanvasTool = 'select' | 'rectangle' | 'arrow' | 'text';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

interface Point {
  x: number;
  y: number;
}

interface ScreenPosition {
  left: string;
  top: string;
}

interface RectElement {
  id: string;
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ArrowElement {
  id: string;
  type: 'arrow';
  start: Point;
  end: Point;
}

interface TextElement {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
}

type CanvasElement = RectElement | ArrowElement | TextElement;

@Component({
  selector: 'app-canvas-board',
  standalone: true,
  imports: [CommonModule, LayoutModule, MatButtonModule, MatIconModule],
  templateUrl: './canvas-board.component.html',
  styleUrls: ['./canvas-board.component.css']
})
export class CanvasBoardComponent implements AfterViewInit {
  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainerRef', { static: true }) canvasContainerRef!: ElementRef<HTMLElement>;
  @ViewChild('surfaceRef') surfaceRef!: ElementRef<HTMLElement>;

  readonly tools: CanvasTool[] = ['select', 'rectangle', 'arrow', 'text'];
  activeTool: CanvasTool = 'select';
  elements: CanvasElement[] = [];
  selectedElementId: string | null = null;
  overviewOpen = false;
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

  constructor(
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.resizeCanvas();
    this.syncCanvasCssSize();
    this.render();
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

  setTool(tool: CanvasTool): void {
    this.activeTool = tool;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedElementId) {
      this.deleteSelectedElement();
      event.preventDefault();
    }
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (this.overviewOpen) {
      return;
    }
    const point = this.screenToWorld(this.getCanvasPoint(event));

    if (this.activeTool === 'text') {
      const value = window.prompt('Texte:');
      if (value && value.trim()) {
        this.elements.push({
          id: crypto.randomUUID(),
          type: 'text',
          x: point.x,
          y: point.y,
          text: value.trim()
        });
        this.render();
      }
      return;
    }

    if (this.activeTool === 'select') {
      const hit = this.findElementAtPoint(point);
      this.selectedElementId = hit?.id ?? null;
      this.render();
      return;
    }

    this.isDrawing = true;
    this.dragStart = point;

    if (this.activeTool === 'rectangle') {
      this.draftElement = {
        id: crypto.randomUUID(),
        type: 'rectangle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0
      };
    }

    if (this.activeTool === 'arrow') {
      this.draftElement = {
        id: crypto.randomUUID(),
        type: 'arrow',
        start: { ...point },
        end: { ...point }
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

  private handlePointerUp(_event?: MouseEvent): void {
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
  }

  clearCanvas(): void {
    this.elements = [];
    this.draftElement = null;
    this.selectedElementId = null;
    this.render();
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
  }

  startResizeFromHandle(handle: ResizeHandle, event: MouseEvent): void {
    event.stopPropagation();
    const selected = this.getSelectedElement();
    if (!selected || selected.type !== 'rectangle') return;
    this.isResizingRectangle = true;
    this.resizeHandle = handle;
    this.resizeStartRect = { ...selected };
  }

  startMoveFromHandle(event: MouseEvent): void {
    event.stopPropagation();
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
  }

  onCanvasDoubleClick(event: MouseEvent): void {
    if (this.overviewOpen) {
      return;
    }
    const point = this.screenToWorld(this.getCanvasPoint(event));
    const hit = this.findElementAtPoint(point);
    if (!hit) return;
    this.selectedElementId = hit.id;
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
    this.elements = this.elements.filter((el) => el.id !== this.selectedElementId);
    this.selectedElementId = null;
    this.render();
  }

  toggleOverview(): void {
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
  }

  onCanvasScroll(): void {}

  goBack(): void {
    this.router.navigate(['/constructeurs']);
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
    const scroll = container.querySelector('.canvas-scroll') as HTMLElement | null;
    if (scroll) {
      return { w: scroll.clientWidth, h: scroll.clientHeight };
    }
    return { w: container.clientWidth, h: container.clientHeight };
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

  private getCanvasPoint(event: MouseEvent | WheelEvent): Point {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const rx = rect.width > 0 ? canvas.width / rect.width : 1;
    const ry = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (event.clientX - rect.left) * rx,
      y: (event.clientY - rect.top) * ry
    };
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
  }

  private getCanvasScrollEl(): HTMLElement | null {
    return this.canvasContainerRef?.nativeElement?.querySelector('.canvas-scroll') as HTMLElement | null;
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
    } else if (element.type === 'arrow') {
      const p1 = this.worldPointToOverviewPreview(element.start, pad);
      const p2 = this.worldPointToOverviewPreview(element.end, pad);
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

  private drawElement(element: CanvasElement, isDraft = false): void {
    if (!this.ctx) return;

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = isDraft ? '#64748b' : '#2563eb';
    this.ctx.fillStyle = '#0f172a';
    this.ctx.setLineDash(isDraft ? [6, 4] : []);

    if (element.type === 'rectangle') {
      this.ctx.strokeRect(element.x, element.y, element.width, element.height);
    } else if (element.type === 'arrow') {
      this.drawArrow(element.start, element.end);
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

    if (selected.type === 'arrow') {
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

    const margin = 80;
    const growLeft = minX < margin ? Math.ceil(margin - minX) : 0;
    const growTop = minY < margin ? Math.ceil(margin - minY) : 0;
    const growRight = maxX > canvas.width - margin ? Math.ceil(maxX - (canvas.width - margin)) : 0;
    const growBottom = maxY > canvas.height - margin ? Math.ceil(maxY - (canvas.height - margin)) : 0;

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
      return (
        point.x >= element.x - tolerance &&
        point.x <= element.x + element.width + tolerance &&
        point.y >= element.y - tolerance &&
        point.y <= element.y + element.height + tolerance
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

    return this.distanceToSegment(point, element.start, element.end) <= tolerance;
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
      return { x: element.x, y: element.y, width: element.width, height: element.height };
    }

    if (element.type === 'arrow') {
      const x = Math.min(element.start.x, element.end.x);
      const y = Math.min(element.start.y, element.end.y);
      return {
        x,
        y,
        width: Math.max(1, Math.abs(element.end.x - element.start.x)),
        height: Math.max(1, Math.abs(element.end.y - element.start.y))
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
