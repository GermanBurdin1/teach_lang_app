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
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';



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
    MatButtonModule,
    MatCardModule,
    MatButtonToggleModule,
    MatInputModule,
    MatPaginatorModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ]
})
export class LessonsModule { }
