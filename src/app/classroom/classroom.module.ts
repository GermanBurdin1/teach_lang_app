import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonMaterialComponent } from './lesson-material/lesson-material.component';
import { LayoutModule } from '../layout/layout.module';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabsComponent } from './lesson-material/tabs/tabs.component';
import { VideoCallComponent } from '../features/lessons/video-call/video-call.component';



const routes: Routes = [
  { path: ':id/lesson', component: LessonMaterialComponent },
  {
    path: ':id/board',
    loadComponent: () =>
      import('./lesson-material/interactive-board/interactive-board.component').then(
        (m) => m.InteractiveBoardComponent
      )
  }
];

@NgModule({
  declarations: [
    LessonMaterialComponent,
    VideoCallComponent
  ],
  imports: [
    CommonModule,
    LayoutModule,
    FormsModule,
    TabsComponent,
    RouterModule.forChild(routes) // Маршрут компонента
  ],
  exports: [VideoCallComponent]
})
export class ClassroomModule { }
