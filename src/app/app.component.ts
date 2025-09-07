import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'front-end';

  constructor(private router: Router) {}
  ngOnInit(): void {
  const currentUrl = this.router.url;
  // TODO : Пересмотреть когда должна перезагружаться страница!!!! пока разрабатываю пусть будет возможность самому вставлять адреса в url
  // ⚠️ не делаем редирект, если пользователь уже указал конкретный путь
  // if (currentUrl === '/' || currentUrl === '') {
  //   const isSchoolDashboard = JSON.parse(localStorage.getItem('isSchoolDashboard') || 'true');
  //   if (isSchoolDashboard) {
  //     this.router.navigate(['school/marathons']);
  //   } else {
  //     this.router.navigate(['student/wordsTeaching']);
  //   }
  // }
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
