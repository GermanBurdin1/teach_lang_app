import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchoolDashboardComponent } from './school-dashboard/school-dashboard.component';
import { UsersComponent } from '../users/users.component';
// import { MaterialsComponent } from '../materials/materials.component';
import { MarathonsComponent } from '../marathons/marathons.component';
import { SettingsComponent } from '../settings/settings.component';
import { TariffsComponent } from '../tariffs/tariffs.component';
import { AdminTeacherProfileComponent } from './school-dashboard/teacher-management/admin-teacher-profile.component';
import { OnlineLessonsComponent } from '../online-lessons/online-lessons.component';
import { StudentProfileComponent } from './student-dashboard/student-profile.component';
// import { StatiscticsComponent } from '../statisctics/statisctics.component';
import { WordsComponent } from '../words/words.component';
import { VocabularyComponent } from '../vocabulary/vocabulary.component';
import { MaterialsComponent } from '../marathons/materials/materials.component';
import { TrainerComponent } from '../trainer/trainer.component';
import { TeacherListComponent } from './student-dashboard/teacher-search-and-consult/teacher-list.component';
import { AdminTeachersListComponent } from './school-dashboard/admin-management_teacher-list-and-details/admin-teachers-list.component';
import {TeacherDetailsComponent} from "./student-dashboard/teacher-search-and-consult/teacher-details.component";
import {AdminTeacherDetailsComponent} from "./school-dashboard/admin-management_teacher-list-and-details/admin-teacher-details.component";
import { TeacherProfileComponent } from './teacher-dashboard/teacher-profile.component';
import { TeacherDashboardOverviewComponent } from './teacher-dashboard/overview/teacher-dashboard-overview.component';
import { TeacherSettingsComponent } from '../settings/teacher-settings/teacher-settings.component';

const routes: Routes = [
  {
    path: '',
    component: SchoolDashboardComponent,
    children: [
      { path: 'school/users', component: UsersComponent },
      { path: 'users/teacher/:id', component: AdminTeacherProfileComponent },
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
      { path: 'student/teachers/:id', component: TeacherDetailsComponent },
      { path: 'admin/teachers', component: AdminTeachersListComponent },
      { path: 'admin/teachers/:id', component: AdminTeacherDetailsComponent },
    ]
  },

  // === TEACHER ROUTES (вне SchoolDashboardComponent) ===
  {
    path: 'teacher',
    component: TeacherProfileComponent,
    children: [
      { path: 'profile', component: TeacherDashboardOverviewComponent },
      { path: 'wordsTeaching', component: WordsComponent },
      { path: 'wordsTeaching/:galaxy/:subtopic', component: VocabularyComponent },
      { path: 'mindmap', component: VocabularyComponent },
      { path: 'trainer', component: TrainerComponent },
      { path: 'settings', component: TeacherSettingsComponent }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
