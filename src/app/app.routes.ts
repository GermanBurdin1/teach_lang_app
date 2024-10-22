import { Routes } from '@angular/router';
import { VocabularyComponent } from './features/vocabulary/vocabulary.component';
import { AboutComponent } from './features/about/about.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { AdminDashboardComponent } from './features/dashboard/admin-dashboard/admin-dashboard.component';
import { UserDashboardComponent } from './features/dashboard/user-dashboard/user-dashboard.component';
import { LessonPageComponent } from './features/lessons/lesson-page/lesson-page.component';
import { VideoCallComponent } from './features/lessons/video-call/video-call.component';

export const routes: Routes = [
  { path: '', component: VocabularyComponent },
  { path: 'about', component: AboutComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'user-dashboard', component: UserDashboardComponent },
  { path: 'lesson-page', component: LessonPageComponent },
  { path: 'video-call', component: VideoCallComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
