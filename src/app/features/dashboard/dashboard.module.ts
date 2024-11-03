import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { UsersComponent } from '../users/users.component';
import { MaterialsComponent } from '../materials/materials.component';
import { MarathonsComponent } from '../marathons/marathons.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { RouterModule } from '@angular/router';
import { LayoutModule } from "../../layout/layout.module";
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';


@NgModule({
  declarations: [
    UsersComponent,
    MaterialsComponent,
    MarathonsComponent,
    StudentDashboardComponent
  ],
  imports: [
    LayoutModule,
    CommonModule,
    RouterModule.forChild([]),
    DashboardRoutingModule,
    FormsModule,
    NgSelectModule,
]
})
export class DashboardModule { }
