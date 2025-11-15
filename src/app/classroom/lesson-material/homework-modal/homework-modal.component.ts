import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../../../../environment';
import { HomeworkService, Homework } from '../../../services/homework.service';
import { AuthService } from '../../../services/auth.service';

export interface HomeworkModalData {
  type: 'task' | 'question' | 'material';
  title: string;
  itemId: string;
  isCourseTemplate?: boolean; // true для шаблонов курсов (создаются через lesson-preview-modal)
  courseId?: string; // ID курса для шаблонов
  createdBy?: string; // ID создателя для сохранения на сервер
}

@Component({
  selector: 'app-homework-modal',
  templateUrl: './homework-modal.component.html',
  styleUrls: ['./homework-modal.component.css']
})
export class HomeworkModalComponent implements OnInit {
  homeworkTitle = '';
  homeworkDescription = '';
  dueDate = '';
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<HomeworkModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HomeworkModalData,
    private homeworkService: HomeworkService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Définir le titre par défaut
    this.homeworkTitle = this.data.title;
    
    // Définir l'échéance à demain par défaut
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.dueDate = tomorrow.toISOString().split('T')[0];
  }

  getTypeTitle(): string {
    switch (this.data.type) {
      case 'task': return 'Tâche';
      case 'question': return 'Question';
      case 'material': return 'Matériel';
      default: return 'Devoir';
    }
  }

  getTypeIcon(): string {
    switch (this.data.type) {
      case 'task': return '📝';
      case 'question': return '❓';
      case 'material': return '📚';
      default: return '📋';
    }
  }

  onSave() {
    if (!this.homeworkTitle.trim() || !this.homeworkDescription.trim() || !this.dueDate) {
      return;
    }

    this.isSaving = true;

    const homeworkData = {
      title: this.homeworkTitle.trim(),
      description: this.homeworkDescription.trim(),
      dueDate: new Date(this.dueDate),
      status: 'assigned',
      type: this.data.type,
      sourceItemId: this.data.itemId,
      createdAt: new Date()
    };

    // Если это шаблон курса, сохраняем на сервер
    if (this.data.isCourseTemplate && this.data.createdBy) {
      this.homeworkService.createCourseTemplateHomework({
        title: homeworkData.title,
        description: homeworkData.description,
        dueDate: homeworkData.dueDate,
        itemType: this.data.type,
        createdBy: this.data.createdBy,
        sourceItemId: this.data.itemId
      }).subscribe({
        next: (savedHomework: Homework) => {
          if (!environment.production) {
            console.log('💾 Шаблон домашнего задания сохранен на сервер:', savedHomework);
          }
          
          // Отправляем событие о создании домашнего задания
          window.dispatchEvent(new CustomEvent('homeworkCreated', {
            detail: {
              itemId: this.data.itemId,
              homework: savedHomework
            }
          }));
          
          this.isSaving = false;
          this.dialogRef.close(savedHomework);
        },
        error: (error: any) => {
          console.error('❌ Ошибка сохранения шаблона домашнего задания:', error);
          this.isSaving = false;
          // Все равно закрываем модалку с данными для локального использования
          this.dialogRef.close(homeworkData);
        }
      });
    } else {
      // Для обычных заданий сохраняем локально (существующий функционал)
      window.setTimeout(() => {
        if (!environment.production) {
          console.log('💾 Sauvegarde du devoir:', homeworkData);
        }
        
        // Отправляем событие о создании домашнего задания
        window.dispatchEvent(new CustomEvent('homeworkCreated', {
          detail: {
            itemId: this.data.itemId,
            homework: homeworkData
          }
        }));
        
        this.isSaving = false;
        this.dialogRef.close(homeworkData);
      }, 1000);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 