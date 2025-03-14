import { Component, OnDestroy, OnInit, ViewChild, AfterViewChecked, HostListener } from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoCallService } from '../../services/video-call.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-lesson-material',
  templateUrl: './lesson-material.component.html',
  styleUrls: ['./lesson-material.component.css'],
})
export class LessonMaterialComponent implements OnInit, OnDestroy {


  backgroundStyle: string = '';
  private backgroundSubscription: Subscription | undefined;
  private isVideoCallStarted = false;
  showBoard = false;


  constructor(private backgroundService: BackgroundService, public lessonTabsService: LessonTabsService, private router: Router, private route: ActivatedRoute, public videoService: VideoCallService) { }

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
    console.log('✅ LessonMaterialComponent загружен');

    this.backgroundSubscription = this.backgroundService.background$.subscribe(
      (newBackground) => {
        this.backgroundStyle = newBackground;
      }
    );

    this.lessonTabsService.contentView$.subscribe((value) => {
      console.log('🔍 Observed contentView:', value);
    });

    // Восстанавливаем обычное видео при возврате в класс
    if (this.videoService.getRegularVideoActive()) {
      console.log('🎥 Восстанавливаем обычное видео после возврата в класс');
      this.videoService.startVideoCall(); // Запускаем обычное видео
    }

    // Выключаем Floating Video при возврате в класс
    this.videoService.setFloatingVideoActive(false);
    this.videoService.toggleFloatingVideo(false);

    this.route.queryParams.subscribe(params => {
      console.log('📍 Получены queryParams:', params);

      if (params['startCall'] === 'true') {
        console.log('🎥 Старт видеозвонка по параметру URL');
        this.videoService.startVideoCall();
      }
    });

    console.log('📍 ActivatedRoute snapshot:', this.route.snapshot.paramMap.keys);
    console.log('📍 ActivatedRoute param id:', this.route.snapshot.paramMap.get('id'));

    this.route.paramMap.subscribe(params => {
      console.log('📍 paramMap содержит:', params.keys);
      const lessonId = params.get('id');
      if (lessonId) {
        console.log(`🔄 Обновляем lessonId: ${lessonId}`);
        this.lessonTabsService.setCurrentLessonId(lessonId);
      }
    });

    this.videoService.resetVideoSize();

  }

  ngOnDestroy(): void {
    if (this.backgroundSubscription) {
      console.log('📢 Отписка от backgroundSubscription');
      this.backgroundSubscription.unsubscribe();
    }

    // ❌ НЕ СБРАСЫВАЕМ ВИДЕО, ЧТОБЫ ОНО НЕ ПРОПАДАЛО
    console.log(`🎥 Перед удалением компонента showVideoCall$ = ${this.videoService.showVideoCallSubject.getValue()}`);
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
    console.log('🔗 Навигация к', `${this.lessonTabsService.getCurrentLessonId()}/board`);

    this.videoService.setRegularVideoActive(false);
    this.videoService.setFloatingVideoActive(true);
    this.videoService.setFloatingVideoSize(320, 180);

    // Принудительное уничтожение и пересоздание доски
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([`${this.lessonTabsService.getCurrentLessonId()}/board`]);
    });
  }

  startVideoCall(): void {
    if (this.videoService.showVideoCallSubject.getValue()) {
      console.log('⚠ Видео уже запущено, не дублируем');
      return;
    }

    console.log('🎥 Запуск видеозвонка');
    this.videoService.startVideoCall();
  }


  set showVideoCall(value: boolean) {
    console.log('🔄 showVideoCall изменён:', value);
    this._showVideoCall = value;
  }

  get showVideoCall(): boolean {
    return this._showVideoCall;
  }

  private _showVideoCall = false;


  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.videoService.onResize(event);
  }

  startDrag(event: MouseEvent): void {
    this.videoService.startResize(event);
  }
}
