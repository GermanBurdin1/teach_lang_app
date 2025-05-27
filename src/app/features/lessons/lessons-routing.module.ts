import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LessonManagementComponent } from './lesson-management/lesson-management.component';
import { TeacherLessonManagementComponent } from './lesson-management/teacher-lesson-management.component';

const routes: Routes = [
  { path: 'student', component: LessonManagementComponent },
  { path: 'teacher', component: TeacherLessonManagementComponent },
  { path: '', redirectTo: 'student', pathMatch: 'full' } 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LessonsRoutingModule {}
