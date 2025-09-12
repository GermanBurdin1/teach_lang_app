import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { UsersComponent } from '../users/users.component';
import { MaterialsComponent } from '../marathons/materials/materials.component';
import { MarathonsComponent } from '../marathons/marathons.component';
import { SchoolDashboardComponent } from './school-dashboard/school-dashboard.component';
import { AdminTeacherProfileComponent } from './school-dashboard/teacher-management/admin-teacher-profile.component';
import { StudentProfileComponent } from './student-dashboard/student-profile.component';
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
import { StudentTrainingComponent } from '../student-training/student-training.component';
import { GrammarFieldsComponent } from "../vocabulary/vocabulary-layout/grammar-fields.component";
import { TeacherListComponent } from '../teacher-search-and-consult/teacher-list.component';
import { AdminTeachersListComponent } from './school-dashboard/admin-management_teacher-list-and-details/admin-teachers-list.component';
import { TeacherDetailsComponent } from '../teacher-search-and-consult/teacher-details.component';
import { PaymentModalComponent } from '../teacher-search-and-consult/payment-modal.component';
import { AdminTeacherDetailsComponent } from './school-dashboard/admin-management_teacher-list-and-details/admin-teacher-details.component';
import { TeacherProfileComponent } from './teacher-dashboard/teacher-profile.component';
import { TeacherDashboardOverviewComponent } from '../../../../overview/teacher-dashboard-overview.component';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { ReviewListComponent } from './shared/components/review-list/review-list.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule } from '@angular/forms';
import { TeacherHomeComponent } from './teacher-dashboard/home/teacher-home.component';
import { StudentHomeComponent } from './student-dashboard/home/student-home.component';
import { AdminHomeComponent } from './school-dashboard/home/admin-home.component';
import { AdminSettingsComponent } from '../settings/admin-settings/admin-settings.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { SentRequestsComponent } from './student-dashboard/sent-requests/sent-requests.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminUsersManagementComponent } from './school-dashboard/admin-users-management/admin-users-management.component';
import { AdminLessonsManagementComponent } from './school-dashboard/admin-lessons-management/admin-lessons-management.component';
import { AdminPlatformAnalyticsComponent } from './school-dashboard/admin-platform-analytics/admin-platform-analytics.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { BackToHomeButtonComponent } from '../../shared/components/back-to-home-button/back-to-home-button.component';

@NgModule({
  declarations: [
    UsersComponent,
    MaterialsComponent,
    MarathonsComponent,
    SchoolDashboardComponent,
    AdminTeacherProfileComponent,
    StudentProfileComponent,
    OnlineLessonsComponent,
    // StatiscticsComponent,
    WordsComponent,
    TrainerComponent,
    StudentTrainingComponent,
    TeacherListComponent,
    AdminTeachersListComponent,
    TeacherDetailsComponent,
    PaymentModalComponent,
    AdminTeacherDetailsComponent,
    TeacherProfileComponent,
    TeacherDashboardOverviewComponent,
    ReviewListComponent,
    TeacherHomeComponent,
    StudentHomeComponent,
    AdminHomeComponent,
    AdminSettingsComponent,
    SentRequestsComponent,
    AdminUsersManagementComponent,
    AdminLessonsManagementComponent,
    AdminPlatformAnalyticsComponent
  ],
  imports: [
    LayoutModule,
    CommonModule,
    TimepickerModule,
    RouterModule.forChild([]),
    DashboardRoutingModule,
    FormsModule,
    NgSelectModule,
    TariffsModule,
    SharedModule,
    GrammarFieldsComponent,
    MatChipsModule,
    ReactiveFormsModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
    BackToHomeButtonComponent,
    BsDatepickerModule.forRoot()
  ],
  exports: [ReviewListComponent]
})
export class DashboardModule { }
