import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'front-end';

  constructor(private router: Router, private authService: AuthService) {}
  ngOnInit(): void {
    // Слушаем события навигации роутера
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Редирект ТОЛЬКО с корневого пути "/" на главные страницы по ролям
      if (event.url === '/') {
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
      // Для всех остальных путей (/login, /register и т.д.) - ничего не делаем
    });
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
