import { Component, AfterViewInit } from '@angular/core';
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
    // Инициализация Fabric.js
    this.canvas = new fabric.Canvas('drawingCanvas', {
      isDrawingMode: true, // Включаем режим рисования
    });

    // Убедимся, что freeDrawingBrush доступен
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = '#000'; // Устанавливаем цвет кисти
      this.canvas.freeDrawingBrush.width = 5; // Устанавливаем ширину кисти
    } else {
      console.warn('freeDrawingBrush is undefined');
    }

    // Пример добавления текста
    const text = new fabric.Text('Добро пожаловать!', {
      left: 50,
      top: 50,
    });
    this.canvas.add(text);
  }
}
