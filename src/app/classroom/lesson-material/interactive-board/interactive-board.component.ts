import { Component, AfterViewInit, HostListener, OnInit } from '@angular/core';
import * as fabric from 'fabric';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoCallService } from '../../../services/video-call.service';
import { ClassroomModule } from '../../classroom.module';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html',
  styleUrls: ['./interactive-board.component.css'],
  imports: [CommonModule, FormsModule, ClassroomModule],
})
export class InteractiveBoardComponent implements OnInit, AfterViewInit {
  canvas!: fabric.Canvas;
  zoomLevel = 1; // Current zoom level
  panX = 0; // Horizontal pan offset
  panY = 0; // Vertical pan offset

  // Brush settings
  brushColor = '#000000'; // Default brush color
  brushWidth = 5; // Default brush width

  // Current tool
  currentTool: 'brush' | 'rectangle' | 'circle' = 'brush';
  // Флаг плавающего видео
  isFloatingVideo: boolean = false;
  floatingVideoPosition = { x: window.innerWidth - 320, y: 20 }; // Изначальная позиция (справа сверху)
  dragging = false;
  offsetX = 0;
  offsetY = 0;


  constructor(private cdr: ChangeDetectorRef, public videoService: VideoCallService) {}

  ngOnInit(): void {
    console.log('📌 BoardComponent загружен');
    setTimeout(() => {
      if (!this.videoService.isFloatingVideoSubject.getValue()) {
        console.log('🟢 Включаем плавающее видео');
        this.videoService.toggleFloatingVideo(true);
      } else {
        console.log('✅ Плавающее видео уже включено');
      }

      // 🔥 Задержка перед обновлением Board
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 100);
    }, 500);
  }
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
    this.trackObjectAddition();

    // Обработка завершения рисования кистью
    this.canvas.on('path:created', (event) => {
      const path = event.path;
      path.selectable = true;
      path.evented = true;
      this.canvas.add(path);
      this.canvas.setActiveObject(path);
      this.canvas.renderAll();
      this.canvas.discardActiveObject();
      this.canvas.setActiveObject(path);
      this.actionHistory.push(path);
      this.canvas.isDrawingMode = false;
      // this.canvas.renderAll();

      console.log('Создан объект кистью:', path);
    });

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

  zoomSelectedFigureIn(): void {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject instanceof fabric.Object) {
      console.log('Масштабируем объект (увеличение):', activeObject);
      activeObject.scaleX = (activeObject.scaleX || 1) * 1.1;
      activeObject.scaleY = (activeObject.scaleY || 1) * 1.1;
      activeObject.setCoords();
      this.canvas.renderAll();
    } else {
      console.log('Нет активного объекта для масштабирования.');
    }
  }

  zoomSelectedFigureOut(): void {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject instanceof fabric.Object) {
      console.log('Масштабируем объект (уменьшение):', activeObject);
      activeObject.scaleX = (activeObject.scaleX || 1) / 1.1;
      activeObject.scaleY = (activeObject.scaleY || 1) / 1.1;
      activeObject.setCoords();
      this.canvas.renderAll();
    } else {
      console.log('Нет активного объекта для масштабирования.');
    }
  }


  private disableDrawingHandlers(): void {
    this.canvas.off('mouse:down');
    this.canvas.off('mouse:move');
    this.canvas.off('mouse:up');
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

    // Удаляем старые обработчики
    this.disableDrawingHandlers();

    if (tool === 'rectangle' || tool === 'circle') {
      let shape: fabric.Rect | fabric.Circle | null = null;
      let startX = 0;
      let startY = 0;

      this.canvas.on('mouse:down', (opt) => {
        // Если есть активный объект, не начинаем рисование новой фигуры
        if (this.canvas.getActiveObject()) {
          console.log('Пропускаем создание фигуры: выбран активный объект');
          return;
        }

        const pointer = this.canvas.getPointer(opt.e);
        startX = pointer.x;
        startY = pointer.y;

        shape = tool === 'rectangle'
          ? new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: this.brushColor,
            strokeWidth: this.brushWidth,
          })
          : new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: 'transparent',
            stroke: this.brushColor,
            strokeWidth: this.brushWidth,
          });

        this.canvas.add(shape);
      });

      this.canvas.on('mouse:move', (opt) => {
        if (!shape || this.currentTool !== tool) return;

        const pointer = this.canvas.getPointer(opt.e);

        if (shape instanceof fabric.Rect) {
          shape.set({
            width: Math.abs(pointer.x - startX),
            height: Math.abs(pointer.y - startY),
            left: Math.min(pointer.x, startX),
            top: Math.min(pointer.y, startY),
          });
        } else if (shape instanceof fabric.Circle) {
          const radius = Math.sqrt(
            Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
          );
          shape.set({ radius });
        }

        this.canvas.renderAll();
      });

      this.canvas.on('mouse:up', () => {
        shape = null;
      });
    }

    if (tool === 'brush') {
      this.canvas.isDrawingMode = true; // Включаем режим рисования
      this.setBrush(); // Настраиваем кисть
    } else {
      this.canvas.isDrawingMode = false; // Выключаем режим рисования
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
      scaleX: 1, // Начальный масштаб по X
      scaleY: 1, // Начальный масштаб по Y
    });
    this.canvas.add(rect);
    this.actionHistory.push(rect);
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
      scaleX: 1, // Начальный масштаб по X
      scaleY: 1, // Начальный масштаб по Y
    });
    this.canvas.add(circle);
    this.actionHistory.push(circle);
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
      console.log('Масштабирование холста:', {
        deltaY: opt.e.deltaY,
        zoomLevel: this.zoomLevel,
      });
      const delta = opt.e.deltaY;
      const pointer = this.canvas.getPointer(opt.e); // Точка прокрутки
      const zoomFactor = 0.999 ** delta;

      let newZoomLevel = this.zoomLevel * zoomFactor;
      newZoomLevel = Math.min(Math.max(newZoomLevel, 0.5), 3); // Ограничение зума

      // Масштабируем холст относительно указателя мыши
      const zoomPoint = new fabric.Point(pointer.x, pointer.y);
      this.canvas.zoomToPoint(zoomPoint, newZoomLevel);

      this.zoomLevel = newZoomLevel;

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

  addText(): void {
    const text = new fabric.Textbox('Введите текст', {
      left: 100,
      top: 100,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000000',
      width: 200,
      editable: true, // Позволяет редактировать текст
    });

    this.canvas.add(text);
    this.canvas.setActiveObject(text); // Выделяем текст
    this.actionHistory.push(text);
    console.log('Добавлен текст:', text);
  }

  changeFontFamily(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const fontFamily = selectElement.value;

    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
      (activeObject as fabric.Textbox).fontFamily = fontFamily;
      this.canvas.renderAll();
      console.log('Изменён шрифт текста:', fontFamily);
    }
  }


  changeFontSize(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const fontSize = parseInt(inputElement.value, 10);

    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
      (activeObject as fabric.Textbox).fontSize = fontSize;
      this.canvas.renderAll();
      console.log('Изменён размер текста:', fontSize);
    }
  }


  changeTextColor(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null; // Приведение типа
    if (inputElement && inputElement.value) { // Проверка на null
      const color = inputElement.value;
      const activeObject = this.canvas.getActiveObject();
      if (activeObject && activeObject.type === 'textbox') {
        (activeObject as fabric.Textbox).fill = color; // Изменение цвета текста
        this.canvas.renderAll();
        console.log('Изменён цвет текста:', color);
      } else {
        console.log('Нет активного текстового объекта для изменения цвета.');
      }
    } else {
      console.error('Ошибка: Не удалось получить значение цвета.');
    }
  }

  resetCanvas(): void {
    this.canvas.clear(); // Очистить все объекты с холста
    this.addGrid(); // Добавить сетку обратно после сброса
    this.actionHistory = [];
    console.log('Холст сброшен');
  }

  actionHistory: fabric.Object[] = []; // Хранилище истории действий

  // Отслеживание добавления объектов
  trackObjectAddition(): void {
    this.canvas.on('object:added', (e) => {
      if (e.target) {
        e.target.selectable = true; // Убедиться, что объект выделяем
        e.target.evented = true; // Реагирует на события
        this.actionHistory.push(e.target); // Сохраняем объект в историю
        console.log('Добавлен объект:', e.target);
      }
    });
  }

  // Метод для отмены последнего действия
  undoLastAction(): void {
    if (this.actionHistory.length > 0) {
      const lastObject = this.actionHistory.pop();
      if (lastObject) {
        this.canvas.remove(lastObject);
        console.log('Последнее действие отменено:', lastObject);
      }
    } else {
      console.log('Нет действий для отмены');
    }
  }

  // удалить объект
  showDeleteModal: boolean = false;

  deleteObject(): void {
    console.log("ФУНКЦИЯ ВЫЗВАНА!!!!!!");
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      this.canvas.remove(activeObject);
      this.actionHistory = this.actionHistory.filter(obj => obj !== activeObject); // Удаляем из истории
      console.log('Объект удалён:', activeObject);
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
    } else {
      console.log('Нет выделенного объекта для удаления.');
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Del') {
      const activeObject = this.canvas.getActiveObject();
      if (activeObject) {
        this.showDeleteModal = true; // Открываем модальное окно
      } else {
        console.log('Нет активного объекта для удаления.');
      }
    }
  }

  confirmDelete(): void {
    this.deleteObject();
    this.showDeleteModal = false;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();

    console.log("🔄 Начало изменения размера видео");

    const startX = event.clientX;
    const startY = event.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Передаем дельту в обе стороны, чтобы ресайз был пропорциональный
      this.videoService.resizeVideo(deltaX, deltaY);
    };

    const onMouseUp = () => {
      console.log("✅ Завершение изменения размера видео");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  startDrag(event: MouseEvent): void {
    this.dragging = true;
    this.offsetX = event.clientX - this.videoService.floatingVideoPosition.x;
    this.offsetY = event.clientY - this.videoService.floatingVideoPosition.y;

    document.addEventListener("mousemove", this.onDragMove.bind(this));
    document.addEventListener("mouseup", this.stopDrag.bind(this));
  }

  onDragMove(event: MouseEvent): void {
    if (!this.dragging) return;

    const maxX = window.innerWidth - this.videoService.videoWidth;
    const maxY = window.innerHeight - this.videoService.videoHeight;

    this.videoService.floatingVideoPosition.x = Math.max(0, Math.min(event.clientX - this.offsetX, maxX));
    this.videoService.floatingVideoPosition.y = Math.max(0, Math.min(event.clientY - this.offsetY, maxY));

    this.cdr.detectChanges(); // 🔥 Форсируем обновление Angular
  }


  stopDrag(): void {
    this.dragging = false;
    document.removeEventListener("mousemove", this.onDragMove.bind(this));
    document.removeEventListener("mouseup", this.stopDrag.bind(this));
  }


}
