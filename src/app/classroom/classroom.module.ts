import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonMaterialComponent } from './lesson-material/lesson-material.component';
import { LayoutModule } from '../layout/layout.module';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabsComponent } from './lesson-material/tabs/tabs.component';

const routes: Routes = [
  { path: ':id/lesson', component: LessonMaterialComponent }
];

@NgModule({
  declarations: [
    LessonMaterialComponent
  ],
  imports: [
    CommonModule,
    LayoutModule,
    FormsModule,
    TabsComponent,
    RouterModule.forChild(routes) // Маршрут компонента
  ]
})
export class ClassroomModule { }
