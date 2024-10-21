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
import { CoreModule } from './app/core/core.module';
import { SharedModule } from './app/shared/shared.module';

@NgModule({
  declarations: [
    AppComponent,
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
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
