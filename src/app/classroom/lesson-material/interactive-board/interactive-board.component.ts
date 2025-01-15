import { Component, AfterViewInit, HostListener } from '@angular/core';
import * as fabric from 'fabric';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html',
  styleUrls: ['./interactive-board.component.css'],
  imports: [CommonModule, FormsModule],
})
export class InteractiveBoardComponent implements AfterViewInit {
  canvas!: fabric.Canvas;
  zoomLevel = 1; // Current zoom level
  panX = 0; // Horizontal pan offset
  panY = 0; // Vertical pan offset

  // Brush settings
  brushColor = '#000000'; // Default brush color
  brushWidth = 5; // Default brush width

  // Current tool
  currentTool: 'brush' | 'rectangle' | 'circle' = 'brush';

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas('drawingCanvas', {
      isDrawingMode: true,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    this.setBrush();
    this.addGrid();
    this.setupZoom();
    this.setupPan();
  }

  // Zoom in and out
  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 0.1, 3); // Limit zoom to 3x
    this.updateCanvasTransform();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.5); // Limit zoom to 0.5x
    this.updateCanvasTransform();
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

  // Set brush properties
  setBrush(): void {
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.color = this.brushColor;
    this.canvas.freeDrawingBrush.width = this.brushWidth;
  }

  // Change brush color
  changeBrushColor(color: string): void {
    this.brushColor = color;
    this.setBrush();
  }

  // Change brush width
  changeBrushWidth(width: number): void {
    this.brushWidth = width;
    this.setBrush();
  }

  // Select tool
  selectTool(tool: 'brush' | 'rectangle' | 'circle'): void {
    this.currentTool = tool;

    // Включаем режим рисования только для кисти
    this.canvas.isDrawingMode = tool === 'brush';

    if (tool === 'rectangle' || tool === 'circle') {
      this.canvas.off('mouse:down'); // Сбрасываем все предыдущие слушатели
      this.canvas.off('mouse:move');
      this.canvas.off('mouse:up');

      let shape: fabric.Rect | fabric.Circle | null = null;
      let startX = 0;
      let startY = 0;

      // Начало рисования фигуры
      this.canvas.on('mouse:down', (opt) => {
        const pointer = this.canvas.getPointer(opt.e);
        startX = pointer.x;
        startY = pointer.y;

        if (tool === 'rectangle') {
          shape = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: this.brushColor,
            strokeWidth: this.brushWidth,
          });
        } else if (tool === 'circle') {
          shape = new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: 'transparent',
            stroke: this.brushColor,
            strokeWidth: this.brushWidth,
          });
        }

        if (shape) {
          this.canvas.add(shape);
        }
      });

      // Рисование фигуры при перемещении мыши
      this.canvas.on('mouse:move', (opt) => {
        if (!shape) return;

        const pointer = this.canvas.getPointer(opt.e);

        if (tool === 'rectangle' && shape instanceof fabric.Rect) {
          shape.set({
            width: Math.abs(pointer.x - startX),
            height: Math.abs(pointer.y - startY),
            left: Math.min(startX, pointer.x),
            top: Math.min(startY, pointer.y),
          });
        } else if (tool === 'circle' && shape instanceof fabric.Circle) {
          const radius = Math.sqrt(
            Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
          );
          shape.set({ radius });
        }

        this.canvas.renderAll();
      });

      // Завершение рисования фигуры
      this.canvas.on('mouse:up', () => {
        shape = null; // Сбрасываем текущую фигуру
      });
    } else {
      // Если включён инструмент "brush", отключаем обработку фигур
      this.canvas.off('mouse:down');
      this.canvas.off('mouse:move');
      this.canvas.off('mouse:up');
    }
  }


  // Draw rectangle
  drawRectangle(): void {
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: 'transparent',
      stroke: this.brushColor,
      strokeWidth: this.brushWidth,
    });
    this.canvas.add(rect);
  }

  // Draw circle
  drawCircle(): void {
    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      radius: 50,
      fill: 'transparent',
      stroke: this.brushColor,
      strokeWidth: this.brushWidth,
    });
    this.canvas.add(circle);
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
      this.canvas.isDrawingMode = this.currentTool === 'brush';
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
