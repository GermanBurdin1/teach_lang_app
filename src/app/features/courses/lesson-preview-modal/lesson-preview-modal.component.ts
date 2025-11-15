import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UploadedFile } from '../../../services/file-upload.service';
import { HomeworkService } from '../../../services/homework.service';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { HomeworkModalComponent, HomeworkModalData } from '../../../classroom/lesson-material/homework-modal/homework-modal.component';

export interface LessonPreviewModalData {
  lessonName: string;
  section: string;
  subSection?: string;
  materials: UploadedFile[];
  courseId: string;
}

@Component({
  selector: 'app-lesson-preview-modal',
  templateUrl: './lesson-preview-modal.component.html',
  styleUrls: ['./lesson-preview-modal.component.css']
})
export class LessonPreviewModalComponent implements OnInit, OnDestroy {
  lessonDescription = '';
  isEditingDescription = false;
  homeworkItems: any[] = [];
  loadingHomework = false;
  isFullscreen = false;
  private materialAddedListener?: EventListener;

  constructor(
    public dialogRef: MatDialogRef<LessonPreviewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LessonPreviewModalData,
    private homeworkService: HomeworkService,
    private authService: AuthService,
    private roleService: RoleService,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadHomework();
    // Загрузить сохраненное описание урока из localStorage или API
    const savedDescription = localStorage.getItem(`lesson_description_${this.data.courseId}_${this.data.section}_${this.data.lessonName}`);
    if (savedDescription) {
      this.lessonDescription = savedDescription;
    }
    
    // Слушаем событие добавления материала для обновления списка
    this.materialAddedListener = ((event: CustomEvent) => {
      if (event.detail && event.detail.material) {
        const material = event.detail.material;
        // Проверяем, относится ли материал к текущему уроку
        if (material.tag === this.data.lessonName) {
          // Добавляем материал в список, если его там еще нет
          if (!this.data.materials.find(m => m.id === material.id)) {
            this.data.materials.push(material);
          }
        }
      }
    }) as EventListener;
    window.addEventListener('materialAdded', this.materialAddedListener);
  }

  ngOnDestroy(): void {
    // Удаляем слушатель события при уничтожении компонента
    if (this.materialAddedListener) {
      window.removeEventListener('materialAdded', this.materialAddedListener);
    }
  }

  loadHomework(): void {
    this.loadingHomework = true;
    const itemId = `${this.data.courseId}_${this.data.section}_${this.data.lessonName}`;
    
    // Получаем текущего пользователя
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.warn('Пользователь не авторизован');
      this.homeworkItems = [];
      this.loadingHomework = false;
      return;
    }

    // Загружаем домашние задания для текущего пользователя в зависимости от роли
    const homeworkObservable = this.roleService.isTeacher()
      ? this.homeworkService.getHomeworkForTeacher(currentUser.id)
      : this.homeworkService.getHomeworkForStudent(currentUser.id);

    homeworkObservable.subscribe({
      next: (homeworkList) => {
        // Фильтруем домашние задания по sourceItemId
        this.homeworkItems = homeworkList.filter(hw => hw.sourceItemId === itemId);
        this.loadingHomework = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки домашних заданий:', error);
        this.homeworkItems = [];
        this.loadingHomework = false;
      }
    });
  }

  toggleEditDescription(): void {
    this.isEditingDescription = !this.isEditingDescription;
  }

  saveDescription(): void {
    const key = `lesson_description_${this.data.courseId}_${this.data.section}_${this.data.lessonName}`;
    localStorage.setItem(key, this.lessonDescription);
    this.isEditingDescription = false;
    // TODO: Сохранить описание на сервер через API
  }

  cancelEditDescription(): void {
    const savedDescription = localStorage.getItem(`lesson_description_${this.data.courseId}_${this.data.section}_${this.data.lessonName}`);
    this.lessonDescription = savedDescription || '';
    this.isEditingDescription = false;
  }

  getFileUrl(url: string | null | undefined): string {
    if (!url) return '#';
    
    // Если URL уже полный, возвращаем его
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace('http://135.125.107.45:3011', 'http://localhost:3011');
    }
    
    // Если URL относительный, добавляем базовый путь
    if (url.startsWith('/')) {
      return `http://localhost:3011${url}`;
    }
    
    return `http://localhost:3011/files/uploads/${url}`;
  }

  getMaterialTypeIcon(mimetype: string): string {
    if (!mimetype) return 'fas fa-file';
    
    if (mimetype.includes('audio')) return 'fas fa-volume-up';
    if (mimetype.includes('video')) return 'fas fa-video';
    if (mimetype.includes('image')) return 'fas fa-image';
    if (mimetype.includes('pdf')) return 'fas fa-file-pdf';
    if (mimetype.includes('text')) return 'fas fa-file-text';
    
    return 'fas fa-file';
  }

  getMaterialTypeFromMime(mimetype: string): string {
    if (!mimetype) return 'file';
    
    if (mimetype.includes('audio')) return 'audio';
    if (mimetype.includes('video')) return 'video';
    if (mimetype.includes('image')) return 'image';
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('text')) return 'text';
    
    return 'file';
  }

  openAddMaterial(): void {
    // Не закрываем текущее модальное окно, а передаем данные через событие для открытия модалки материалов поверх
    const event = new CustomEvent('openMaterialModal', {
      detail: {
        action: 'addMaterial',
        section: this.data.section,
        lesson: this.data.lessonName,
        subSection: this.data.subSection
      }
    });
    window.dispatchEvent(event);
  }

  openAddHomework(): void {
    const itemId = `${this.data.courseId}_${this.data.section}_${this.data.lessonName}`;
    const dialogData: HomeworkModalData = {
      type: 'material',
      title: this.data.lessonName,
      itemId: itemId
    };

    const homeworkDialogRef = this.dialog.open(HomeworkModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData
    });

    homeworkDialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('✅ Devoir créé:', result);
        // Перезагружаем домашние задания
        this.loadHomework();
      }
    });
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      // Разворачиваем на полный экран
      this.dialogRef.updateSize('100vw', '100vh');
      this.dialogRef.addPanelClass('lesson-preview-fullscreen');
    } else {
      // Восстанавливаем обычный размер
      this.dialogRef.updateSize('900px', '90vh');
      this.dialogRef.removePanelClass('lesson-preview-fullscreen');
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

