import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonMaterialComponent } from './lesson-material/lesson-material.component';
import { LayoutModule } from '../layout/layout.module';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabsComponent } from './lesson-material/tabs/tabs.component';
import { VideoCallComponent } from '../features/lessons/video-call/video-call.component';
import { LessonsModule } from '../features/lessons/lessons.module';
import { InteractiveBoardComponent } from './lesson-material/interactive-board/interactive-board.component';
import { GabaritPageComponent } from './lesson-material/gabarit-page/gabarit-page.component';



const routes: Routes = [
  { path: ':id/lesson', component: LessonMaterialComponent },
];

@NgModule({
  declarations: [
    LessonMaterialComponent,
    VideoCallComponent,
    GabaritPageComponent,
    InteractiveBoardComponent
  ],
  imports: [
    CommonModule,
    LayoutModule,
    FormsModule,
    TabsComponent,
    LessonsModule,
    RouterModule.forChild(routes) // Маршрут компонента
  ],
  exports: [VideoCallComponent]
})
export class ClassroomModule { }
