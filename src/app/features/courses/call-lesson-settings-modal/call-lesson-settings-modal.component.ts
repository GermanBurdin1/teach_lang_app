import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { HomeworkModalComponent, HomeworkModalData } from '../../../classroom/lesson-material/homework-modal/homework-modal.component';
import { HomeworkService } from '../../../services/homework.service';
import { AuthService } from '../../../services/auth.service';
import { CourseService } from '../../../services/course.service';

export interface CallLessonSettingsModalData {
  courseId: string;
  courseLessonId?: string; // ID урока курса из course_lessons
  lessonName: string;
  section: string;
  subSection?: string;
  plannedDurationMinutes?: number | null;
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
  homeworkItems: any[] = [];
  loadingHomework = false;

  constructor(
    public dialogRef: MatDialogRef<CallLessonSettingsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CallLessonSettingsModalData,
    private dialog: MatDialog,
    private homeworkService: HomeworkService,
    private authService: AuthService,
    private courseService: CourseService
  ) {}

  ngOnInit(): void {
    // Загружаем текущие настройки урока
    if (this.data.plannedDurationMinutes !== undefined) {
      this.plannedDurationMinutes = this.data.plannedDurationMinutes;
    }
    
    // Загружаем задания для урока
    this.loadHomework();
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
        this.plannedDurationMinutes
      ).subscribe({
        next: () => {
          this.dialogRef.close({
            plannedDurationMinutes: this.plannedDurationMinutes
          });
        },
        error: (error) => {
          console.error('Ошибка сохранения настроек:', error);
        }
      });
    } else {
      // Если урока курса еще нет, просто закрываем с данными
      this.dialogRef.close({
        plannedDurationMinutes: this.plannedDurationMinutes
      });
    }
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
}
