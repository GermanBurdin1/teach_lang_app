import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { LayoutModule } from './layout/layout.module';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { VocabularyModule } from './features/vocabulary/vocabulary.module';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { AuthModule } from './features/auth/auth.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { LessonsModule } from './features/lessons/lessons.module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
// import { TariffsModule } from './features/tariffs/tariffs.module'; // Excluded from prod build
import { SettingsModule } from './features/settings/settings.module';
// import { LandingModule } from './features/landing/landing.module'; // Excluded from prod build
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ClassroomModule } from './classroom/classroom.module';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TeacherSettingsModule } from './features/settings/teacher-settings.module';
import { LOCALE_ID } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { getCosmicPaginatorIntl } from './shared/providers/custom-paginator-intl';
// import { TestVideoCallComponent } from './test-video-call/test-video-call.component'; // Excluded from prod build
import { RgpdModule } from './features/rgpd/rgpd.module';
import { FooterComponent } from './layout/footer/footer.component';
import { UnauthorizedComponent } from './features/unauthorized/unauthorized.component';

@NgModule({
  declarations: [
    AppComponent,
    UnauthorizedComponent,
    // TestVideoCallComponent // Excluded from prod build
  ],
  imports: [
    VocabularyModule,
    BrowserModule,
    LayoutModule,
    FormsModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    AuthModule,
    DashboardModule,
    LessonsModule,
    CoreModule,
    SharedModule,
    // TariffsModule, // Excluded from prod build
    SettingsModule,
    // LandingModule, // Excluded from prod build
    BrowserAnimationsModule,
    BsDropdownModule.forRoot(),
    ClassroomModule, // VideoCallComponent экспортируется отсюда
    BsDatepickerModule.forRoot(),
    TimepickerModule.forRoot(),
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    TeacherSettingsModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule,
    DragDropModule,
    RgpdModule,
    FooterComponent
],
  providers: [
    { provide: LOCALE_ID, useValue: 'fr' }, 
    { provide: MatPaginatorIntl, useValue: getCosmicPaginatorIntl() },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
