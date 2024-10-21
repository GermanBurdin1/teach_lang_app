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
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
