import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClassroomRedirectComponent } from '../../classroom/classroom-redirect.component';
import { SchoolDashboardComponent } from './school-dashboard/school-dashboard.component';
// import { UsersComponent } from '../users/users.component';
// import { MaterialsComponent } from '../materials/materials.component';
// import { MarathonsComponent } from '../marathons/marathons.component';
import { SettingsComponent } from '../settings/settings.component';
// import { TariffsComponent } from '../tariffs/tariffs.component';
//import { AdminTeacherProfileComponent } from './school-dashboard/teacher-management/admin-teacher-profile.component';
// import { OnlineLessonsComponent } from '../online-lessons/online-lessons.component';
//import { StudentProfileComponent } from './student-dashboard/student-profile.component';
// import { StatiscticsComponent } from '../statisctics/statisctics.component';
import { WordsComponent } from '../words/words.component';
import { VocabularyComponent } from '../vocabulary/vocabulary.component';
//import { MaterialsComponent } from '../marathons/materials/materials.component';
import { TrainerComponent } from '../trainer/trainer.component';
import { StudentTrainingComponent } from '../student-training/student-training.component';
import { TrainingComponent } from '../training/training.component';
import { TeacherListComponent } from '../teacher-search-and-consult/teacher-list.component';
import { AdminTeachersListComponent } from './school-dashboard/admin-management_teacher-list-and-details/admin-teachers-list.component';
import {TeacherDetailsComponent} from "../teacher-search-and-consult/teacher-details.component";
import {AdminTeacherDetailsComponent} from "./school-dashboard/admin-management_teacher-list-and-details/admin-teacher-details.component";
import { TeacherProfileComponent } from './teacher-dashboard/teacher-profile.component';
import { TeacherDashboardOverviewComponent } from './teacher-dashboard/overview/teacher-dashboard-overview.component';
import { TeacherSettingsComponent } from '../settings/teacher-settings/teacher-settings.component';
import { StudentSettingsComponent } from '../settings/student-settings/student-settings.component';
import { TeacherHomeComponent } from './teacher-dashboard/home/teacher-home.component';
import { StudentHomeComponent } from './student-dashboard/home/student-home.component';
import { AdminHomeComponent } from './school-dashboard/home/admin-home.component';
import { AdminSettingsComponent } from '../settings/admin-settings/admin-settings.component';
import { SentRequestsComponent } from './student-dashboard/sent-requests/sent-requests.component';
import { AdminUsersManagementComponent } from './school-dashboard/admin-users-management/admin-users-management.component';
import { AdminLessonsManagementComponent } from './school-dashboard/admin-lessons-management/admin-lessons-management.component';
import { AdminPlatformAnalyticsComponent } from './school-dashboard/admin-platform-analytics/admin-platform-analytics.component';
import { AnalyticsDashboardComponent } from '../admin/analytics-dashboard/analytics-dashboard.component';
import { AddCourseComponent } from '../courses/add-course/add-course.component';

const routes: Routes = [
  {
    path: '',
    component: SchoolDashboardComponent,
    children: [
      // { path: 'school/users', component: UsersComponent },
      //{ path: 'users/teacher/:id', component: AdminTeacherProfileComponent },
      //{ path: 'users/student/:id', component: StudentProfileComponent },
      //{ path: 'school/online-lessons', component: OnlineLessonsComponent },
      // { path: 'school/materials', component: MaterialsComponent },
      // { path: 'school/marathons', component: MarathonsComponent },
      { path: 'school/settings', component: SettingsComponent },
      // { path: 'school/tariffs', component: TariffsComponent },
      // { path: 'school/statistics', component: StatiscticsComponent },
      { path: 'student/home', component: StudentHomeComponent },
      { path: 'student/wordsTeaching', component: WordsComponent },
      { path: 'student/wordsTeaching/:galaxy/:subtopic', component: VocabularyComponent },
      { path: 'student/trainer', component: TrainerComponent },
      { path: 'student/training', component: TrainingComponent },
      // { path: 'school/course/:id', component: MaterialsComponent},
      { path: 'student/teachers', component: TeacherListComponent },
      { path: 'student/teachers/:id', component: TeacherDetailsComponent },
      { path: 'student/sent-requests', component: SentRequestsComponent },
      { path: 'student/settings', component: StudentSettingsComponent },
      { path: 'admin/teachers', component: AdminTeachersListComponent },
      { path: 'admin/teachers/:id', component: AdminTeacherDetailsComponent },
      { path: 'admin/home', component: AdminHomeComponent },
      { path: 'admin/settings', component: AdminSettingsComponent },
      { path: 'admin/gestion-utilisateurs', component: AdminUsersManagementComponent },
      { path: 'admin/gestion-cours', component: AdminLessonsManagementComponent },
      { path: 'admin/analytique-plateforme', component: AdminPlatformAnalyticsComponent },
      { path: 'admin/ga4-analytics', component: AnalyticsDashboardComponent },
      { path: 'admin/add-course', component: AddCourseComponent },
      { path: 'teacher/add-course', component: AddCourseComponent }
    ]
  },

  // === TEACHER ROUTES (вне SchoolDashboardComponent) ===
  {
    path: 'teacher',
    component: TeacherProfileComponent,
    children: [
      { path: 'profile', component: TeacherDashboardOverviewComponent },
      { path: 'home', component: TeacherHomeComponent },
      { path: 'wordsTeaching', component: WordsComponent },
      { path: 'wordsTeaching/:galaxy/:subtopic', component: VocabularyComponent },
      { path: 'mindmap', component: VocabularyComponent },
      { path: 'trainer', component: TrainerComponent },
      { path: 'training', component: TrainingComponent },
      { 
        path: 'classroom', 
        component: ClassroomRedirectComponent,
        resolve: { lessonData: 'LessonResolverService' }
      },
      { path: 'settings', component: TeacherSettingsComponent },
      { path: 'add-course', component: AddCourseComponent }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
