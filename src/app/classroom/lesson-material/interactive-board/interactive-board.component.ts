import { Component, AfterViewInit, HostListener } from '@angular/core';
import * as fabric from 'fabric';

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html',
  styleUrls: ['./interactive-board.component.css'],
})
export class InteractiveBoardComponent implements AfterViewInit {
  canvas!: fabric.Canvas;

  ngAfterViewInit(): void {
    // Инициализация Canvas
    this.canvas = new fabric.Canvas('drawingCanvas', {
      isDrawingMode: true, // Включаем режим рисования
      width: window.innerWidth, // Устанавливаем ширину на весь экран
      height: window.innerHeight, // Устанавливаем высоту на весь экран
    });

    this.addGrid();
    this.setupZoom();

    // Установка параметров рисования
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = '#000'; // Устанавливаем цвет кисти
      this.canvas.freeDrawingBrush.width = 5; // Устанавливаем ширину кисти
    }
  }

  // Добавление сетки
  private addGrid(): void {
    const gridSize = 50; // Размер ячейки
    for (let i = 0; i < this.canvas.width!; i += gridSize) {
      this.canvas.add(
        new fabric.Line([i, 0, i, this.canvas.height!], {
          stroke: '#e0e0e0',
          selectable: false,
        })
      );
    }
    for (let i = 0; i < this.canvas.height!; i += gridSize) {
      this.canvas.add(
        new fabric.Line([0, i, this.canvas.width!, i], {
          stroke: '#e0e0e0',
          selectable: false,
        })
      );
    }
  }

  // Настройка масштабирования (зумирования)
  private setupZoom(): void {
    this.canvas.on('mouse:wheel', (opt: fabric.TEvent<WheelEvent>) => {
      const delta = opt.e.deltaY;
      let zoom = this.canvas.getZoom();
      zoom *= 0.999 ** delta;

      // Ограничение зума
      if (zoom > 3) zoom = 3;
      if (zoom < 0.5) zoom = 0.5;

      this.canvas.setZoom(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  // Событие для обновления размера Canvas при изменении размеров окна
  @HostListener('window:resize')
  onResize(): void {
    this.canvas.setWidth(window.innerWidth);
    this.canvas.setHeight(window.innerHeight);
    this.addGrid();
  }
}
