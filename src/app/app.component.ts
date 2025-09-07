import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'front-end';

  constructor(private router: Router, private authService: AuthService) {}
  ngOnInit(): void {
    const currentUrl = this.router.url;
    
    // Редирект с корневого пути на главные страницы по ролям
    if (currentUrl === '/' || currentUrl === '') {
      // Проверяем, есть ли сохраненная роль пользователя
      const userRole = this.authService.currentRole;
      
      if (userRole === 'student') {
        this.router.navigate(['/cabinet/school/student/home']);
      } else if (userRole === 'teacher') {
        this.router.navigate(['/teacher/home']);
      } else if (userRole === 'admin') {
        this.router.navigate(['/cabinet/school/dashboard/admin/home']);
      } else {
        // Если роль не определена, перенаправляем на логин
        this.router.navigate(['/login']);
      }
    }
  }

  isDashboardRoute(): boolean {
    const currentUrl = this.router.url;
    // Dashboard routes where sidebar should be shown
    const dashboardRoutes = [
      '/student-dashboard',
      '/cabinet/school',
      '/classroom'
    ];
    
    // Check if current URL starts with any dashboard route
    return dashboardRoutes.some(route => currentUrl.startsWith(route));
  }

  shouldShowHeader(): boolean {
    const hiddenRoutes = ['/login', '/register'];
    return !hiddenRoutes.includes(this.router.url);
  }
}
