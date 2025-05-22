import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { LayoutModule } from './layout/layout.module';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { VocabularyModule } from './features/vocabulary/vocabulary.module';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { AboutModule } from './features/about/about.module';
import { AuthModule } from './features/auth/auth.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { LessonsModule } from './features/lessons/lessons.module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { TariffsModule } from './features/tariffs/tariffs.module';
import { SettingsModule } from './features/settings/settings.module';
import { LandingModule } from './features/landing/landing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ClassroomModule } from './classroom/classroom.module';
import { provideHttpClient } from '@angular/common/http';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { TeacherSettingsModule } from './features/settings/teacher-settings.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    VocabularyModule,
    BrowserModule,
    LayoutModule,
    AboutModule,
    FormsModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    AuthModule,
    DashboardModule,
    LessonsModule,
    CoreModule,
    SharedModule,
    TariffsModule,
    SettingsModule,
    LandingModule,
    BrowserAnimationsModule,
    BsDropdownModule.forRoot(),
    ClassroomModule,
    BsDatepickerModule.forRoot(),
    TimepickerModule.forRoot(),
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    TeacherSettingsModule,
    MatChipsModule,
],
  providers: [provideHttpClient()],
  bootstrap: [AppComponent]
})
export class AppModule { }
