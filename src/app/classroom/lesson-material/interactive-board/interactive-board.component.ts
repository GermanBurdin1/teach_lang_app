import { Component, AfterViewInit, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VideoCallService } from '../../../services/video-call.service';
import { ClassroomModule } from '../../classroom.module';
import { ChangeDetectorRef } from '@angular/core';
import { WhiteWebSdk, Room, RoomPhase } from 'white-web-sdk';
import { WhiteboardService } from '../../../services/whiteboard.service';
import { ApplianceNames } from 'white-web-sdk';
import { LessonTabsService } from '../../../services/lesson-tabs.service';


@Component({
  selector: 'app-interactive-board',
  standalone: true,
  templateUrl: './interactive-board.component.html',
  styleUrls: ['./interactive-board.component.css'],
  imports: [CommonModule, FormsModule, ClassroomModule],
})
export class InteractiveBoardComponent implements OnInit, AfterViewInit {
  @ViewChild('whiteboardContainer', { static: false }) whiteboardContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('videoCallElement', { static: false }) videoCallElement!: ElementRef;
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
  private room?: Room;


  constructor(private cdr: ChangeDetectorRef, public videoService: VideoCallService,
    private whiteboardService: WhiteboardService, private lessonTabsService: LessonTabsService) { }

  ngOnInit(): void {
    this.whiteboardService.room$.subscribe((room) => {
      if (room) {
        console.log("🎨 Комната установлена в компоненте:", room);
        this.room = room;
      } else {
        console.log("❌ Комната все еще не установлена");
      }
    });
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

  getCurrentUserId(): string {
    return localStorage.getItem('userId') || 'guest';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const videoElements = document.querySelectorAll('app-video-call');
      console.log(`🔍 Найдено <app-video-call>:`, videoElements.length);
      this.videoService.onResize(new MouseEvent('resize'));
    }, 1000);
    console.log("📌 Контейнер найден через @ViewChild:", this.whiteboardContainer.nativeElement);
    this.whiteboardService.createRoomAndJoin(this.getCurrentUserId(), this.whiteboardContainer.nativeElement);
  }


  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.videoService.onResize(event);
  }

  startDrag(event: MouseEvent): void {
    this.dragging = true;

    // Получаем сам элемент floating-video
    const floatingVideo = document.querySelector('.floating-video') as HTMLElement;
    if (!floatingVideo) return;

    // Запоминаем текущее положение видео
    const rect = floatingVideo.getBoundingClientRect();
    this.offsetX = event.clientX - rect.left;
    this.offsetY = event.clientY - rect.top;

    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
  }

  onDragMove(event: MouseEvent): void {
    if (!this.dragging) return;

    const floatingVideo = document.querySelector('.floating-video') as HTMLElement;
    if (!floatingVideo) return;

    const maxX = window.innerWidth - floatingVideo.offsetWidth;
    const maxY = window.innerHeight - floatingVideo.offsetHeight;

    // Вычисляем новую позицию с учетом границ экрана
    const newX = Math.max(0, Math.min(event.clientX - this.offsetX, maxX));
    const newY = Math.max(0, Math.min(event.clientY - this.offsetY, maxY));

    console.log(`🔄 Перемещение: (${newX}, ${newY})`);

    // Применяем новую позицию к floating-video
    floatingVideo.style.left = `${newX}px`;
    floatingVideo.style.top = `${newY}px`;

    // Обновляем координаты в сервисе
    this.videoService.floatingVideoPosition.x = newX;
    this.videoService.floatingVideoPosition.y = newY;

    this.cdr.detectChanges();
  }

  stopDrag(): void {
    this.dragging = false;
    document.removeEventListener('mousemove', this.onDragMove.bind(this));
    document.removeEventListener('mouseup', this.stopDrag.bind(this));
  }

  //рисование
  setDrawingMode(): void {
    if (this.room) {
      console.log("🖌 Устанавливаем режим рисования...");
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.pencil, // Инструмент: карандаш
        strokeColor: [0, 0, 0], // Черный цвет
        strokeWidth: 4, // Толщина линии
      });
      console.log("✅ Режим рисования установлен.");
    } else {
      console.error("❌ Ошибка: комната (room) не определена!");
    }
  }

  setTextMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.text,
        textSize: 16,
      });
    }
  }

  setEraserMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.eraser,
      });
    }
  }

  zoomIn(): void {
    if (this.room) {
      let scale = this.room.state.cameraState.scale;
      this.room.moveCamera({ scale: Math.min(scale + 0.2, 3) }); // Максимальный зум = 3x
    }
  }

  zoomOut(): void {
    if (this.room) {
      let scale = this.room.state.cameraState.scale;
      this.room.moveCamera({ scale: Math.max(scale - 0.2, 0.5) }); // Минимальный зум = 0.5x
    }
  }

  moveCanvas(x: number, y: number): void {
    if (this.room) {
      let camera = this.room.state.cameraState;
      this.room.moveCamera({
        centerX: camera.centerX + x,
        centerY: camera.centerY + y,
      });
    }
  }


  changeBrushColor(color: string): void {
    if (this.room) {
      this.room.setMemberState({
        strokeColor: this.hexToRgb(color),
      });
    }
  }

  changeBrushWidth(width: number): void {
    if (this.room) {
      this.room.setMemberState({
        strokeWidth: width,
      });
    }
  }

  selectTool(tool: 'pencil' | 'rectangle' | 'ellipse'): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames[tool as keyof typeof ApplianceNames],
      });
    }
  }

  setRectangleMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.rectangle,
        strokeColor: [255, 0, 0],
        strokeWidth: 3,
      });
    }
  }

  setEllipseMode(): void {
    if (this.room) {
      console.log("✍️ Writable перед установкой инструмента:", this.room?.isWritable);
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.ellipse,
        strokeColor: [0, 0, 255],
        strokeWidth: 3,
      });
      console.log("🔍 Текущий state:", this.room?.state.memberState);
    } else {
      console.error("❌ Ошибка: комната (room) не определена!");
    }
  }


  setLineMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.straight,
        strokeColor: [0, 0, 0],
        strokeWidth: 2,
      });
    }
  }

  clearBoard(): void {
    if (this.room) {
      this.room.cleanCurrentScene(false); // false - удаляет все, включая PPT
    }
  }

  undoLastAction(): void {
    if (this.room) {
      const remainingUndos = this.room.undo();
      console.log(`🛑 Отмена последнего действия. Осталось отмен: ${remainingUndos}`);
    }
  }

  setSelectionMode(): void {
    if (this.room) {
      this.room.setMemberState({
        currentApplianceName: ApplianceNames.clicker,
      });
    }
  }

  changeFontSize(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const fontSize = parseInt(inputElement.value, 10);

    if (this.room) {
      this.room.setMemberState({
        textSize: fontSize,
      });
    }
  }

  changeTextColor(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const color = inputElement.value;

    if (this.room) {
      this.room.setMemberState({
        strokeColor: this.hexToRgb(color),
      });
    }
  }

  resetPosition(): void {
    if (this.room) {
      this.room.moveCamera({
        centerX: 0,
        centerY: 0,
        scale: 1,
      });
    }
  }


  // Функция для конвертации HEX в RGB (так требует Agora)
  private hexToRgb(hex: string): number[] {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  //добавление заметок
  addStickyNote(): void {
    const note = document.createElement('div');
    note.className = 'sticky-note';
    note.contentEditable = 'true';
    note.innerText = 'Новая заметка';
    note.style.position = 'absolute';
    note.style.top = '100px';
    note.style.left = '100px';
    note.style.backgroundColor = 'yellow';
    note.style.padding = '10px';
    note.style.borderRadius = '5px';
    note.style.cursor = 'move';

    document.body.appendChild(note);
  }

  addTextToBoard(text: string, x: number, y: number): void {
    if (this.room) {
      this.room.insertText(x, y, text);
    }
  }

}
