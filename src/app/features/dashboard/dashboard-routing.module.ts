import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { UsersComponent } from '../users/users.component';
import { MaterialsComponent } from '../materials/materials.component';
import { MarathonsComponent } from '../marathons/marathons.component';
import { SettingsComponent } from '../settings/settings.component';
import { TariffsComponent } from '../tariffs/tariffs.component';

const routes: Routes = [
  {
    path: 'dashboard',
    component: StudentDashboardComponent,
    children: [
      { path: 'users', component: UsersComponent },
      { path: 'materials', component: MaterialsComponent },
      { path: 'marathons', component: MarathonsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'tariffs', component: TariffsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
