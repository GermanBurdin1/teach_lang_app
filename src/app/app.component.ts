import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'front-end';

  constructor(private router: Router) {}

  isDashboardRoute(): boolean {
    // Проверяем, содержит ли текущий URL часть "dashboard"
    return this.router.url === '/student-dashboard';
  }
}
