import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { UsersComponent } from '../users/users.component';
import { MaterialsComponent } from '../materials/materials.component';
import { MarathonsComponent } from '../marathons/marathons.component';
import { SettingsComponent } from '../settings/settings.component';
import { TariffsComponent } from '../tariffs/tariffs.component';
import { TeacherProfileComponent } from './teacher-profile/teacher-profile.component';
import { OnlineLessonsComponent } from '../online-lessons/online-lessons.component';

const routes: Routes = [
  {
    path: '',
    component: StudentDashboardComponent,
    children: [
      { path: 'users', component: UsersComponent },
      { path: 'users/teacher/:id', component: TeacherProfileComponent },
      { path: 'online-lessons', component: OnlineLessonsComponent },
      { path: 'materials', component: MaterialsComponent },
      { path: 'marathons', component: MarathonsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'tariffs', component: TariffsComponent },
      { path: '', redirectTo: 'users', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
