import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchoolDashboardComponent } from './school-dashboard/school-dashboard.component';
import { UsersComponent } from '../users/users.component';
// import { MaterialsComponent } from '../materials/materials.component';
import { MarathonsComponent } from '../marathons/marathons.component';
import { SettingsComponent } from '../settings/settings.component';
import { TariffsComponent } from '../tariffs/tariffs.component';
import { TeacherProfileComponent } from './school-dashboard/teacher-profile/teacher-profile.component';
import { OnlineLessonsComponent } from '../online-lessons/online-lessons.component';
import { StudentProfileComponent } from './school-dashboard/student-profile/student-profile.component';
// import { StatiscticsComponent } from '../statisctics/statisctics.component';
import { WordsComponent } from '../words/words.component';
import { VocabularyComponent } from '../vocabulary/vocabulary.component';
import { MaterialsComponent } from '../marathons/materials/materials.component';
import { TrainerComponent } from '../trainer/trainer.component';
import { TeacherListComponent } from './school-dashboard/student-profile/teacher-search/teacher-list.component';
import { AdminTeachersListComponent } from './admin-dashboard/teachers/admin-teachers-list.component';

const routes: Routes = [
  {
    path: '',
    component: SchoolDashboardComponent,
    children: [
      { path: 'school/users', component: UsersComponent },
      { path: 'users/teacher/:id', component: TeacherProfileComponent },
      { path: 'users/student/:id', component: StudentProfileComponent },
      { path: 'school/online-lessons', component: OnlineLessonsComponent },
      // { path: 'school/materials', component: MaterialsComponent },
      { path: 'school/marathons', component: MarathonsComponent },
      { path: 'school/settings', component: SettingsComponent },
      { path: 'school/tariffs', component: TariffsComponent },
      // { path: 'school/statistics', component: StatiscticsComponent },
      { path: 'student/wordsTeaching', component: WordsComponent },
      { path: 'student/wordsTeaching/:galaxy/:subtopic', component: VocabularyComponent },
      { path: 'student/trainer', component: TrainerComponent },
      { path: 'school/course/:id', component: MaterialsComponent},
      { path: 'student/teachers', component: TeacherListComponent },
      { path: 'admin/teachers', component: AdminTeachersListComponent },
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
