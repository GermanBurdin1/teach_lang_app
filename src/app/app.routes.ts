import { Routes } from '@angular/router';
import { VocabularyComponent } from './features/vocabulary/vocabulary.component';
import { LoginComponent } from './features/auth/components/login/login.component';
import { RegisterComponent } from './features/auth/components/register/register.component';
// import { VideoCallComponent } from './features/lessons/video-call/video-call.component'; // TODO ВИДЕО-ВЫЗОВЫ ВРЕМЕННО ЗАКОММЕНТИРОВАНЫ
// import { TestVideoCallComponent } from './test-video-call/test-video-call.component'; // Excluded from prod build
// import { LandingComponent } from './features/landing/landing.component'; // Excluded from prod build
// import { PreviewLandingComponent } from './features/landing/preview-landing/preview-landing.component'; // Excluded from prod build
import { RoleGuard } from './core/guards/role.guard';
import { AuthGuard } from './core/guards/auth.guard';



export const routes: Routes = [
  { path: '', component: VocabularyComponent }, // Временно, будет редирект в app.component
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'logout', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'cabinet/school',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'cabinet/teacher',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'teacher',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'lessons',
    loadChildren: () => import('./features/lessons/lessons.module').then(m => m.LessonsModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['student', 'teacher'] }
  },
  //{ path: 'video-call', component: VideoCallComponent }, // TODO ВИДЕО-ВЫЗОВЫ ВРЕМЕННО ЗАКОММЕНТИРОВАНЫ
  // { path: 'test-video', component: TestVideoCallComponent }, // Excluded from prod build
  // { path: 'landing', component: LandingComponent }, // Excluded from prod build
  // { path: 'landing/preview', component: PreviewLandingComponent }, // Excluded from prod build
  { path: 'data-rights', loadChildren: () => import('./features/rgpd/rgpd.module').then(m => m.RgpdModule) },
  { path: 'privacy-policy', loadChildren: () => import('./features/rgpd/rgpd.module').then(m => m.RgpdModule) },
  { path: 'cookies-policy', loadChildren: () => import('./features/rgpd/rgpd.module').then(m => m.RgpdModule) },
  { path: 'terms', loadChildren: () => import('./features/rgpd/rgpd.module').then(m => m.RgpdModule) },
  { path: 'classroom', loadChildren: () => import('./classroom/classroom.module').then(m => m.ClassroomModule), canActivate: [AuthGuard] },
  { path: 'student', loadChildren: () => import('./classroom/classroom.module').then(m => m.ClassroomModule), canActivate: [AuthGuard] },
  {
    path: 'mindmap',
    loadChildren: () => import('./features/mindmap/mindmap.module').then(m => m.MindmapModule),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
