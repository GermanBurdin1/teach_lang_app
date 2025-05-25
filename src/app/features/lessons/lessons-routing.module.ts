import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LessonManagementComponent } from './lesson-management/lesson-management.component';

const routes: Routes = [
  { path: '', component: LessonManagementComponent } 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LessonsRoutingModule {}
