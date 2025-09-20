import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LessonMaterialComponent } from './lesson-material/lesson-material.component';
import { LayoutModule } from '../layout/layout.module';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
// import { TabsComponent } from './lesson-material/tabs/tabs.component'; // Excluded from prod build
import { VideoCallComponent } from '../features/lessons/video-call/video-call.component';
import { VideoCallService } from '../services/video-call.service';
import { LessonsModule } from '../features/lessons/lessons.module';
import { InteractiveBoardComponent } from './lesson-material/interactive-board/interactive-board.component';
import { GabaritPageComponent } from './lesson-material/gabarit-page/gabarit-page.component';
import { LessonNotesModalComponent } from './lesson-material/lesson-notes-modal/lesson-notes-modal.component';
import { HomeworkModalComponent } from './lesson-material/homework-modal/homework-modal.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';

const routes: Routes = [
  { path: ':id/lesson', component: LessonMaterialComponent },
];

@NgModule({
  declarations: [
    LessonMaterialComponent,
    VideoCallComponent,
    GabaritPageComponent,
    InteractiveBoardComponent,
    LessonNotesModalComponent,
    HomeworkModalComponent
  ],
  imports: [
    CommonModule,
    LayoutModule,
    FormsModule,
    // TabsComponent, // Excluded from prod build
    LessonsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    RouterModule.forChild(routes) // Маршрут компонента
  ],
  providers: [DatePipe, VideoCallService],
  exports: [VideoCallComponent]
})
export class ClassroomModule { }
