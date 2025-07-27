import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';

//components for school tab
import { SchoolComponent } from './school/school.component';
import { GeneralSettingsComponent } from './school/general-settings.component';
import { ContactsComponent } from './school/contacts.component';
import { AdminsComponent } from './school/admins.component';
import { PaymentsComponent } from './school/payments.component';
import { AccessControlComponent } from './school/access-control.component';
import { ReportsComponent } from './school/reports.component';

// composants pour les onglets en ligne
import { OnlineLessonsComponent } from './online-courses/online-lessons.component';
import { OnlineCoursesComponent } from './online-courses/online-courses.component';
import { GeneralSettingsOnlineComponent } from './online-courses/general-settings-online.component';
import { TeachersComponent } from './online-courses/teachers.component';
import { StudentsOnlineComponent } from './online-courses/students-online.component';
import { BalanceSystemComponent } from './online-courses/balance-system.component';
import { ReportsOnlineComponent } from './online-courses/reports-online.component';

const routes: Routes = [
  { path: '', component: SettingsComponent },
];

@NgModule({
  declarations: [
    SettingsComponent,
    // onglets school
    SchoolComponent,
    GeneralSettingsComponent,
    ContactsComponent,
    AdminsComponent,
    PaymentsComponent,
    AccessControlComponent,
    ReportsComponent,

    // onglets en ligne
    OnlineLessonsComponent,
    OnlineCoursesComponent,
    GeneralSettingsOnlineComponent,
    TeachersComponent,
    StudentsOnlineComponent,
    BalanceSystemComponent,
    ReportsOnlineComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
  ],
  exports: [
    SettingsComponent,
    GeneralSettingsComponent,
    ContactsComponent,
    AdminsComponent,
    PaymentsComponent,
    AccessControlComponent,
    ReportsComponent,
    OnlineCoursesComponent,
    GeneralSettingsOnlineComponent,
    TeachersComponent,
    StudentsOnlineComponent,
    BalanceSystemComponent,
    ReportsOnlineComponent,
    ReactiveFormsModule,
  ]
})
export class SettingsModule { }
