import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { UsersComponent } from '../users/users.component';
import { MaterialsComponent } from '../marathons/materials/materials.component';
import { MarathonsComponent } from '../marathons/marathons.component';
import { SchoolDashboardComponent } from './school-dashboard/school-dashboard.component';
import { TeacherProfileComponent } from './school-dashboard/teacher-profile/teacher-profile.component';
import { StudentProfileComponent } from './school-dashboard/student-profile/student-profile.component';
import { RouterModule } from '@angular/router';
import { LayoutModule } from "../../layout/layout.module";
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { OnlineLessonsComponent } from '../online-lessons/online-lessons.component';
import { TariffsModule } from "../tariffs/tariffs.module";
// import { StatiscticsComponent } from '../statisctics/statisctics.component';
import { WordsComponent } from '../words/words.component';
import { SharedModule } from '../../shared/shared.module';
import { TrainerComponent } from '../trainer/trainer.component';
import { GrammarFieldsComponent } from "../vocabulary/vocabulary-layout/grammar-fields.component";


@NgModule({
  declarations: [
    UsersComponent,
    MaterialsComponent,
    MarathonsComponent,
    SchoolDashboardComponent,
    TeacherProfileComponent,
    StudentProfileComponent,
    OnlineLessonsComponent,
    // StatiscticsComponent,
    WordsComponent,
    TrainerComponent
  ],
  imports: [
    LayoutModule,
    CommonModule,
    RouterModule.forChild([]),
    DashboardRoutingModule,
    FormsModule,
    NgSelectModule,
    TariffsModule,
    SharedModule,
    GrammarFieldsComponent
]
})
export class DashboardModule { }
