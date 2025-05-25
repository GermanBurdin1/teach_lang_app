import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LessonCardComponent } from './lesson-card/lesson-card.component';
import { LessonManagementComponent } from './lesson-management/lesson-management.component';
import { FormsModule } from '@angular/forms';
import { LessonsRoutingModule } from './lessons-routing.module';

@NgModule({
  declarations: [LessonCardComponent, LessonManagementComponent],
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    LessonsRoutingModule
  ]
})
export class LessonsModule { }
