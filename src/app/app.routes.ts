import { Routes } from '@angular/router';
import { VocabularyComponent } from './features/vocabulary/vocabulary.component';
import { AboutComponent } from './about/about.component';

export const routes: Routes = [
  { path: '', component: VocabularyComponent },
  { path: 'about', component: AboutComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
