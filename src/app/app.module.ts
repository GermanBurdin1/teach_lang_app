import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { LayoutModule } from './layout/layout.module';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { VocabularyComponent } from './vocabulary/vocabulary.component';
import { routes } from './app.routes';

@NgModule({
  declarations: [
    AppComponent,
    VocabularyComponent
  ],
  imports: [
    BrowserModule,
    LayoutModule,
    FormsModule,
    RouterModule.forRoot(routes)
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
