import { Routes } from '@angular/router';
import { VocabularyComponent } from './features/vocabulary/vocabulary.component';
import { AboutComponent } from './features/about/about.component';
import { LoginComponent } from './features/auth/components/login/login.component';
import { RegisterComponent } from './features/auth/components/register/register.component';
import { LessonPageComponent } from './features/lessons/lesson-page/lesson-page.component';
import { VideoCallComponent } from './features/lessons/video-call/video-call.component';
import { LandingComponent } from './features/landing/landing.component';
import { PreviewLandingComponent } from './features/landing/preview-landing/preview-landing.component';

export const routes: Routes = [
  { path: '', component: VocabularyComponent },
  { path: 'about', component: AboutComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'cabinet/school',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'cabinet/teacher',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  { path: 'lesson-page', component: LessonPageComponent },
  { path: 'video-call', component: VideoCallComponent },
  { path: 'landing', component: LandingComponent},
  { path: 'landing/preview', component: PreviewLandingComponent},
  { path: 'classroom', loadChildren: () => import('./classroom/classroom.module').then(m => m.ClassroomModule) },
  {path: 'mindmap',
    loadChildren: () => import('./features/mindmap/mindmap.module').then(m => m.MindmapModule)
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
