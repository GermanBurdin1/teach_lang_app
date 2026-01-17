import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MindmapWrapperComponent } from './mindmap-wrapper.component';
import { MainComponent } from './main/main.component';
import { CreateMindmapComponent } from './create-mindmap/create-mindmap.component';
import { StudentMindmapComponent } from './student-mindmap/student-mindmap.component';
import { MindmapRouterComponent } from './mindmap-router.component';

const routes: Routes = [
  // Используем компонент-обертку для определения роли и показа нужного компонента
  {
    path: '',
    component: MindmapRouterComponent
  },
  // Роуты для преподавателей (/constructeurs) - проверка через RoleGuard в app.routes
  {
    path: 'mindmap',
    component: MainComponent
  },
  {
    path: 'instant',
    component: MindmapWrapperComponent
  },
  {
    path: 'create',
    component: CreateMindmapComponent
  },
  // Роуты для студентов (/mindmap) - проверка через RoleGuard в app.routes
  {
    path: 'student',
    component: StudentMindmapComponent
  },
  {
    path: 'student/create',
    component: CreateMindmapComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MindmapRoutingModule {}
