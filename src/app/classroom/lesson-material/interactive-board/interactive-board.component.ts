import { Component, AfterViewInit, HostListener } from '@angular/core';
import * as fabric from 'fabric';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html',
  styleUrls: ['./interactive-board.component.css'],
  imports: [CommonModule], // Добавьте CommonModule
})
export class InteractiveBoardComponent implements AfterViewInit {
  canvas!: fabric.Canvas;
  zoomLevel = 1; // Current zoom level
  panX = 0; // Horizontal pan offset
  panY = 0; // Vertical pan offset

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas('drawingCanvas', {
      isDrawingMode: true,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    this.addGrid();
    this.setupZoom();
    this.setupPan();
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.1, 3); // Limit zoom to 3x
    this.canvas.setZoom(this.zoomLevel);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5); // Limit zoom to 0.5x
    this.canvas.setZoom(this.zoomLevel);
  }

  moveCanvas(direction: 'up' | 'down' | 'left' | 'right'): void {
    const step = 50; // Movement step
    switch (direction) {
      case 'up':
        this.panY -= step;
        break;
      case 'down':
        this.panY += step;
        break;
      case 'left':
        this.panX -= step;
        break;
      case 'right':
        this.panX += step;
        break;
    }
    this.updateCanvasTransform();
  }

  resetPosition(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoomLevel = 1;
    this.updateCanvasTransform();
  }

  private updateCanvasTransform(): void {
    this.canvas.setViewportTransform([
      this.zoomLevel,
      0,
      0,
      this.zoomLevel,
      this.panX,
      this.panY,
    ]);
  }

  private addGrid(): void {
    const gridSize = 50; // Size of each grid cell
    const width = this.canvas.getWidth()!;
    const height = this.canvas.getHeight()!;

    for (let i = 0; i < width; i += gridSize) {
      this.canvas.add(
        new fabric.Line([i, 0, i, height], {
          stroke: '#e0e0e0',
          selectable: false,
        })
      );
    }

    for (let i = 0; i < height; i += gridSize) {
      this.canvas.add(
        new fabric.Line([0, i, width, i], {
          stroke: '#e0e0e0',
          selectable: false,
        })
      );
    }
  }

  private setupZoom(): void {
    this.canvas.on('mouse:wheel', (opt: fabric.TEvent<WheelEvent>) => {
      const delta = opt.e.deltaY;
      this.zoomLevel *= 0.999 ** delta;

      this.zoomLevel = Math.min(Math.max(this.zoomLevel, 0.5), 3); // Limit zoom

      this.canvas.setZoom(this.zoomLevel);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  private setupPan(): void {
    this.canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey) {
        this.canvas.isDrawingMode = false;
        this.canvas.setCursor('grab');
        this.canvas.renderAll();
      }
    });

    this.canvas.on('mouse:move', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey && evt.buttons === 1) {
        const delta = new fabric.Point(evt.movementX, evt.movementY);
        this.canvas.relativePan(delta);
      }
    });

    this.canvas.on('mouse:up', () => {
      this.canvas.isDrawingMode = true;
      this.canvas.setCursor('default');
      this.canvas.renderAll();
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.canvas.setWidth(window.innerWidth);
    this.canvas.setHeight(window.innerHeight);
    this.addGrid();
  }
}
