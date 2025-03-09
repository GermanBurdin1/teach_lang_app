import { Component, OnDestroy, OnInit, ViewChild, AfterViewChecked, HostListener} from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Router,ActivatedRoute } from '@angular/router';
import { VideoCallComponent } from '../../features/lessons/video-call/video-call.component';

@Component({
  selector: 'app-lesson-material',
  templateUrl: './lesson-material.component.html',
  styleUrls: ['./lesson-material.component.css'],
})
export class LessonMaterialComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('videoCall', { read: VideoCallComponent }) videoCallComponent!: VideoCallComponent;


  backgroundStyle: string = '';
  private backgroundSubscription: Subscription | undefined;
  private isVideoCallStarted = false;

  // Флаг плавающего видео
  isFloatingVideo: boolean = false;
  floatingVideoPosition = { x: window.innerWidth - 320, y: 20 }; // Изначальная позиция (справа сверху)
  dragging = false;
  offsetX = 0;
  offsetY = 0;



  constructor(private backgroundService: BackgroundService, public lessonTabsService: LessonTabsService, private router: Router, private route: ActivatedRoute ) { }

  listIcons: string[] = [
    'icon-empty', // Заглушка для первой иконки
    'icon-empty', // Заглушка для второй иконки
    'icon-empty', // Заглушка для третьей иконки
    'fas fa-chalkboard', // Заполненная иконка
  ];

  trackByIndex(index: number, item: string): number {
    return index;
  }


  ngOnInit(): void {
    // Подписываемся на изменения фона
    this.backgroundSubscription = this.backgroundService.background$.subscribe(
      (newBackground) => {
        this.backgroundStyle = newBackground;
      }
    );
    this.lessonTabsService.contentView$.subscribe((value) => {
      console.log('Observed contentView:', value);
    });

    this.route.queryParams.subscribe(params => {
      if (params['startCall'] === 'true') {
        this.startVideoCall();
      }
    });

  }

  ngAfterViewChecked(): void {
    if (this.showVideoCall && !this.isVideoCallStarted && this.videoCallComponent) {
      console.log('✅ VideoCallComponent найден в ngAfterViewChecked, запускаем startCall()');
      this.isVideoCallStarted = true;
      this.videoCallComponent.startCall();
    }
  }

  ngOnDestroy(): void {
    // Отписываемся при уничтожении компонента
    if (this.backgroundSubscription) {
      this.backgroundSubscription.unsubscribe();
    }
  }

  // стилизация
  highlight: string | null = null;

  highlightCard(card: string) {
    this.highlight = card;
  }

  resetCard(card: string) {
    if (this.highlight === card) {
      this.highlight = null;
    }
  }

  //
  showLanguageModal: boolean = false; // Отображение модального окна
  selectedLanguage: string = ''; // Выбранный язык


  // Открытие интерактивной доски
  openInteractiveBoard(): void {
    this.isFloatingVideo = true;
    this.videoCallComponent.videoWidth = 320;
    this.videoCallComponent.videoHeight = 180;
    this.router.navigate([`${this.lessonTabsService.getCurrentLessonId()}/board`]); // Убедитесь, что ID урока указан
  }
  startVideoCall(): void {
    console.log('🎥 startVideoCall() вызван');
    this.showVideoCall = true;
  }

  set showVideoCall(value: boolean) {
    console.log('🔄 showVideoCall изменён:', value);
    this._showVideoCall = value;
  }

  get showVideoCall(): boolean {
    return this._showVideoCall;
  }

  private _showVideoCall = false;

   // Функции для перемещения окна
   startDrag(event: MouseEvent): void {
    this.dragging = true;
    this.offsetX = event.clientX - this.floatingVideoPosition.x;
    this.offsetY = event.clientY - this.floatingVideoPosition.y;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    const maxX = window.innerWidth - 320; // Максимальная ширина
    const maxY = window.innerHeight - 180; // Максимальная высота

    this.floatingVideoPosition.x = Math.max(0, Math.min(event.clientX - this.offsetX, maxX));
    this.floatingVideoPosition.y = Math.max(0, Math.min(event.clientY - this.offsetY, maxY));
}

  @HostListener('document:mouseup')
  stopDrag(): void {
    this.dragging = false;
  }
}
