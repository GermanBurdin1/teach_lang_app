import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { HomeworkModalComponent, HomeworkModalData } from '../../../classroom/lesson-material/homework-modal/homework-modal.component';
import { AddMaterialModalComponent, AddMaterialModalData } from '../add-material-modal/add-material-modal.component';
import { HomeworkService } from '../../../services/homework.service';
import { AuthService } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';
import { FileUploadService, UploadedFile } from '../../../services/file-upload.service';
import { NotificationService } from '../../../services/notification.service';
import { MaterialService, Material } from '../../../services/material.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';

export interface CallLessonSettingsModalData {
  courseId: string;
  courseLessonId?: string; // ID урока курса из course_lessons
  lessonName: string;
  section: string;
  subSection?: string;
  plannedDurationMinutes?: number | null;
  description?: string | null;
  lessonId?: string | null; // ID реального урока из lessons (если уже создан)
}

@Component({
  selector: 'app-call-lesson-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './call-lesson-settings-modal.component.html',
  styleUrls: ['./call-lesson-settings-modal.component.css']
})
export class CallLessonSettingsModalComponent implements OnInit {
  plannedDurationMinutes: number | null = null;
  description: string = '';
  homeworkItems: any[] = [];
  loadingHomework = false;
  materials: UploadedFile[] = [];
  trainerMaterials: Material[] = [];
  loadingTrainerMaterials = false;

  constructor(
    public dialogRef: MatDialogRef<CallLessonSettingsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CallLessonSettingsModalData,
    private dialog: MatDialog,
    private homeworkService: HomeworkService,
    private authService: AuthService,
    private courseService: CourseService,
    private fileUploadService: FileUploadService,
    private http: HttpClient,
    private notificationService: NotificationService,
    private materialService: MaterialService
  ) {}

  ngOnInit(): void {
    // Загружаем текущие настройки урока
    if (this.data.plannedDurationMinutes !== undefined) {
      this.plannedDurationMinutes = this.data.plannedDurationMinutes;
    }
    if (this.data.description !== undefined && this.data.description !== null) {
      this.description = this.data.description;
    }
    
    // Загружаем задания для урока
    this.loadHomework();
    // Загружаем материалы для урока
    this.loadMaterials();
    // Загружаем материалы из Training
    this.loadTrainerMaterials();
  }
  
  loadTrainerMaterials(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.trainerMaterials = [];
      this.loadingTrainerMaterials = false;
      return;
    }
    
    this.loadingTrainerMaterials = true;
    this.materialService.getMaterialsForTeacher(currentUser.id).subscribe({
      next: (materials) => {
        this.trainerMaterials = materials;
        this.loadingTrainerMaterials = false;
        console.log('✅ Trainer materials loaded:', materials);
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки материалов из Training:', error);
        this.trainerMaterials = [];
        this.loadingTrainerMaterials = false;
      }
    });
  }
  
  loadMaterials(): void {
    if (!this.data.courseId) return;
    
    this.fileUploadService.getFiles(this.data.courseId).subscribe({
      next: (files: UploadedFile[]) => {
        // Фильтруем материалы по уроку
        // Материалы привязаны к уроку через tag = lessonName (как в getMaterialsByLesson)
        const lessonName = this.data.lessonName;
        this.materials = files.filter((file: UploadedFile) => {
          // Проверяем, что материал привязан к этому уроку через tag
          return file.tag === lessonName;
        });
      },
      error: (error: any) => {
        console.error('Ошибка загрузки материалов:', error);
        this.materials = [];
      }
    });
  }

  loadHomework(): void {
    this.loadingHomework = true;
    const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
    const lessonItemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`;

    this.homeworkService.getCourseTemplateHomeworkBySourceItemId(lessonItemId).subscribe({
      next: (homeworkList) => {
        this.homeworkItems = homeworkList.map(hw => ({
          ...hw,
          dueDate: hw.dueDate ? new Date(hw.dueDate) : null
        }));
        this.loadingHomework = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки домашних заданий:', error);
        this.homeworkItems = [];
        this.loadingHomework = false;
      }
    });
  }

  saveSettings(): void {
    // Сохраняем настройки через API
    if (this.data.courseLessonId) {
      // Обновляем настройки существующего урока курса
      this.courseService.updateCallLessonSettings(
        this.data.courseLessonId,
        this.plannedDurationMinutes,
        this.description || null
      ).subscribe({
        next: () => {
          this.dialogRef.close({
            plannedDurationMinutes: this.plannedDurationMinutes,
            description: this.description || null
          });
        },
        error: (error) => {
          console.error('Ошибка сохранения настроек:', error);
        }
      });
    } else {
      // Если урока курса еще нет, просто закрываем с данными
      this.dialogRef.close({
        plannedDurationMinutes: this.plannedDurationMinutes,
        description: this.description || null
      });
    }
  }
  
  openAddMaterial(): void {
    const materialData: AddMaterialModalData = {
      section: this.data.section,
      lesson: this.data.lessonName,
      subSection: this.data.subSection,
      courseId: this.data.courseId,
      trainerMaterials: this.trainerMaterials,
      loadingTrainerMaterials: this.loadingTrainerMaterials
    };

    const dialogRef = this.dialog.open(AddMaterialModalComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: materialData,
      panelClass: 'add-material-modal-dialog',
      backdropClass: 'add-material-modal-backdrop'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('✅ Matériau ajouté:', result);
        if (result.action === 'create') {
          // Создание нового материала
          this.createMaterial(result.material);
        } else if (result.action === 'addExisting') {
          // Добавление существующего материала
          this.addExistingMaterialToCourse(result.material);
        }
      }
    });
  }

  openAddHomework(): void {
    const subSectionPart = this.data.subSection ? `${this.data.subSection}_` : '';
    const itemId = `${this.data.courseId}_${this.data.section}_${subSectionPart}${this.data.lessonName}`;
    const currentUser = this.authService.getCurrentUser();

    const dialogData: HomeworkModalData = {
      type: 'material',
      title: this.data.lessonName,
      itemId: itemId,
      isCourseTemplate: true,
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
        }, 500);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  async createMaterial(materialData: any): Promise<void> {
    if (!materialData.title?.trim()) {
      this.notificationService.error('Veuillez saisir un titre pour le matériel');
      return;
    }

    if (!this.data.courseId) {
      this.notificationService.error('Veuillez d\'abord créer le cours');
      return;
    }

    try {
      if (materialData.file) {
        // Загружаем файл
        const tag = this.data.lessonName; // Используем имя урока как tag
        this.fileUploadService.uploadFileAsCourse(materialData.file, this.data.courseId, tag).subscribe({
          next: (response) => {
            console.log('✅ Материал создан:', response);
            this.notificationService.success('Matériel créé avec succès!');
            // Перезагружаем материалы
            setTimeout(() => {
              this.loadMaterials();
            }, 500);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la création du matériel:', error);
            this.notificationService.error('Erreur lors de la création du matériel');
          }
        });
      } else if (materialData.type === 'text' && materialData.content) {
        // Для текстовых материалов создаем файл
        const tag = this.data.lessonName;
        const uploadedFile: UploadedFile = {
          id: Date.now(),
          filename: materialData.title,
          url: materialData.content,
          mimetype: 'text/plain',
          courseId: this.data.courseId,
          createdAt: new Date().toISOString(),
          tag: tag,
          description: materialData.description || undefined
        };
        
        // Отправляем событие для обновления материалов в родительском компоненте
        window.dispatchEvent(new CustomEvent('materialAdded', {
          detail: { material: uploadedFile }
        }));
        
        this.notificationService.success('Matériel créé avec succès!');
        setTimeout(() => {
          this.loadMaterials();
        }, 500);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du matériel:', error);
      this.notificationService.error('Erreur lors de la création du matériel');
    }
  }

  addExistingMaterialToCourse(material: Material): void {
    if (!this.data.courseId) {
      this.notificationService.error('Veuillez d\'abord créer le cours');
      return;
    }

    try {
      const fileUrl = material.content;
      if (fileUrl) {
        const courseIdNum = parseInt(this.data.courseId, 10);
        if (isNaN(courseIdNum)) {
          this.notificationService.error('ID курса некорректен');
          return;
        }
        
        const tag = this.data.lessonName; // Используем имя урока как tag
        this.fileUploadService.linkFileToCourse(fileUrl, courseIdNum, tag).subscribe({
          next: (response) => {
            console.log('✅ Материал связан с курсом:', response);
            this.notificationService.success(`Matériau "${material.title}" ajouté au cours avec succès!`);
            // Перезагружаем материалы
            setTimeout(() => {
              this.loadMaterials();
            }, 500);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la liaison du matériau au cours:', error);
            // Если связывание не удалось, пробуем загрузить файл заново
            this.downloadAndUploadFile(material);
          }
        });
      } else {
        this.notificationService.error('Le matériau n\'a pas de contenu');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du matériau:', error);
      this.notificationService.error('Erreur lors de l\'ajout du matériau');
    }
  }

  private downloadAndUploadFile(material: Material): void {
    let fileUrl = material.content;
    
    if (fileUrl.startsWith('/files') || !fileUrl.startsWith('http')) {
      if (fileUrl.startsWith('/files')) {
        fileUrl = fileUrl.substring(6);
      }
      fileUrl = `${API_ENDPOINTS.FILES}${fileUrl}`;
    }
    
    this.http.get(fileUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const fileExtension = this.getFileExtensionFromUrl(material.content);
        const fileName = `${material.title}${fileExtension}`;
        
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          mimeType = this.getMimeTypeFromExtension(fileExtension);
        }
        
        const file = new File([blob], fileName, { type: mimeType });
        const tag = this.data.lessonName;
        
        this.fileUploadService.uploadFileAsCourse(file, this.data.courseId, tag).subscribe({
          next: (response) => {
            console.log('✅ Материал добавлен в курс:', response);
            this.notificationService.success(`Matériau "${material.title}" ajouté au cours avec succès!`);
            setTimeout(() => {
              this.loadMaterials();
            }, 500);
          },
          error: (error) => {
            console.error('❌ Erreur lors de l\'ajout du matériau au cours:', error);
            this.notificationService.error('Erreur lors de l\'ajout du matériau au cours');
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors du téléchargement du fichier:', error);
        this.notificationService.error(`Impossible de télécharger le fichier: ${error.message || 'Erreur de connexion'}`);
      }
    });
  }

  private getFileExtensionFromUrl(url: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    return match ? `.${match[1]}` : '';
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}
