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
    const isSchoolDashboard = JSON.parse(localStorage.getItem('isSchoolDashboard') || 'true');
    if (isSchoolDashboard) {
      this.router.navigate(['school/statistics']);
    } else {
      this.router.navigate(['student/wordsTeaching']);
    }
  }

  isDashboardRoute(): boolean {
    // Проверяем, содержит ли текущий URL часть "dashboard"
    return this.router.url === '/student-dashboard';
  }
}
