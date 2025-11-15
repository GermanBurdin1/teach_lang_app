import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UploadedFile } from '../../../services/file-upload.service';
import { HomeworkService } from '../../../services/homework.service';
import { AuthService } from '../../../services/auth.service';
import { RoleService } from '../../../services/role.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { HomeworkModalComponent, HomeworkModalData } from '../../../classroom/lesson-material/homework-modal/homework-modal.component';
import { forkJoin } from 'rxjs';

export interface LessonPreviewModalData {
  lessonName: string;
  section: string;
  subSection?: string;
  materials: UploadedFile[];
  courseId: string;
  description?: string;
  lessonType?: 'self' | 'call'; // Тип урока
}

@Component({
  selector: 'app-lesson-preview-modal',
  templateUrl: './lesson-preview-modal.component.html',
  styleUrls: ['./lesson-preview-modal.component.css']
})
export class LessonPreviewModalComponent implements OnInit, OnDestroy {
  lessonDescription = '';
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
    // Загружаем описание урока из data (передается из структуры lessons)
    if (this.data.description) {
      this.lessonDescription = this.data.description;
    } else {
      // Для обратной совместимости проверяем localStorage
      const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
      const savedDescription = localStorage.getItem(`lesson_description_${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`);
      if (savedDescription) {
        this.lessonDescription = savedDescription;
        // Миграция: сохраняем описание из localStorage в структуру lessons при первом открытии
        this.saveDescription();
      }
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

  homeworkByMaterial: { [materialId: string]: any[] } = {};
  lessonHomeworkItems: any[] = [];

  loadHomework(): void {
    this.loadingHomework = true;
    const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
    const lessonItemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`;
    
    // ВСЕГДА загружаем задания к материалам (для отображения под материалами)
    // И общие задания урока (для отображения в lesson-homework-section)
    const sourceItemIds: string[] = [lessonItemId];
    
    // Добавляем sourceItemId для каждого материала (для всех типов уроков)
    this.data.materials.forEach(material => {
      const materialItemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}_material_${material.id}`;
      sourceItemIds.push(materialItemId);
    });

    // Загружаем шаблоны курсов для всех sourceItemId
    const homeworkObservables = sourceItemIds.map(itemId => 
      this.homeworkService.getCourseTemplateHomeworkBySourceItemId(itemId)
    );

    // Объединяем все запросы
    forkJoin(homeworkObservables).subscribe({
        next: (homeworkArrays) => {
          // Разделяем задания на привязанные к материалам и общие к уроку
          this.homeworkByMaterial = {};
          this.lessonHomeworkItems = [];
          
          homeworkArrays.forEach((homeworkList, index) => {
            const itemId = sourceItemIds[index];
            homeworkList.forEach(hw => {
              // Преобразуем формат из backend в формат для фронтенда
              const homeworkItem = {
                ...hw,
                sourceItemId: itemId,
                dueDate: hw.dueDate ? new Date(hw.dueDate) : null
              };
              
              if (itemId.includes('_material_')) {
                // Задания к материалам (отображаются под каждым материалом)
                const materialId = itemId.split('_material_')[1];
                if (!this.homeworkByMaterial[materialId]) {
                  this.homeworkByMaterial[materialId] = [];
                }
                this.homeworkByMaterial[materialId].push(homeworkItem);
              } else if (itemId === lessonItemId) {
                // Общие задания урока (отображаются в lesson-homework-section)
                this.lessonHomeworkItems.push(homeworkItem);
              }
            });
          });
          
          // homeworkItems используется только для общего подсчета в заголовке
          // Для уроков типа 'self' в lesson-homework-section показываем только lessonHomeworkItems
          // Для уроков типа 'call' можно показывать все, но мы все равно показываем только lessonHomeworkItems
          this.homeworkItems = [...this.lessonHomeworkItems];
          Object.values(this.homeworkByMaterial).forEach(materialHw => {
            this.homeworkItems.push(...materialHw);
          });
          
          this.loadingHomework = false;
        },
        error: (error) => {
          console.error('Ошибка загрузки домашних заданий:', error);
          this.homeworkItems = [];
          this.homeworkByMaterial = {};
          this.lessonHomeworkItems = [];
          this.loadingHomework = false;
        }
      });
  }

  getHomeworkForMaterial(materialId: number): any[] {
    return this.homeworkByMaterial[materialId?.toString()] || [];
  }

  saveDescription(): void {
    // Отправляем событие для обновления структуры lessons и сохранения в БД
    window.dispatchEvent(new CustomEvent('lessonDescriptionUpdated', {
      detail: {
        courseId: this.data.courseId,
        section: this.data.section,
        subSection: this.data.subSection,
        lessonName: this.data.lessonName,
        description: this.lessonDescription
      }
    }));
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

  openAddHomework(materialId?: number): void {
    let itemId: string;
    let title: string;
    
    if (materialId) {
      // Задание к конкретному материалу
      const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
      itemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}_material_${materialId}`;
      const material = this.data.materials.find(m => m.id === materialId);
      title = material ? material.filename : this.data.lessonName;
    } else {
      // Общее задание к уроку
      const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
      itemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`;
      title = this.data.lessonName;
    }
    
    // Получаем текущего пользователя для сохранения на сервер
    const currentUser = this.authService.getCurrentUser();
    
    const dialogData: HomeworkModalData = {
      type: 'material',
      title: title,
      itemId: itemId,
      isCourseTemplate: true, // Помечаем как шаблон курса
      courseId: this.data.courseId,
      createdBy: currentUser?.id || ''
    };

    const homeworkDialogRef = this.dialog.open(HomeworkModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData
    });

    homeworkDialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('✅ Devoir créé:', result);
        // Перезагружаем домашние задания после создания
        setTimeout(() => {
          this.loadHomework();
        }, 500); // Небольшая задержка для обновления на сервере
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

