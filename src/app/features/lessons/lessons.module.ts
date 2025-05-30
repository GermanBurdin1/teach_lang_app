import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LessonCardComponent } from './lesson-card/lesson-card.component';
import { LessonManagementComponent } from './lesson-management/lesson-management.component';
import { TeacherLessonManagementComponent } from './lesson-management/teacher-lesson-management.component';
import { TeacherLessonCardComponent } from './lesson-management/teacher-lesson-card.component';
import { FormsModule } from '@angular/forms';
import { LessonsRoutingModule } from './lessons-routing.module';
import { GabaritComponent } from './lesson-management/gabarit/gabarit-component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';


@NgModule({
  declarations: [LessonCardComponent, LessonManagementComponent, TeacherLessonManagementComponent, TeacherLessonCardComponent, GabaritComponent],
  exports: [
    GabaritComponent // ✅ Добавь это
  ],
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    LessonsRoutingModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule
  ]
})
export class LessonsModule { }
