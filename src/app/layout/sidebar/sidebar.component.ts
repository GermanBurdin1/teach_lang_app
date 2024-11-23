import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  isSchoolDashboard = true; // По умолчанию администратор

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    // Читаем сохраненное состояние из localStorage
    const storedState = localStorage.getItem('isSchoolDashboard');

    if (storedState !== null) {
      this.isSchoolDashboard = JSON.parse(storedState); // Устанавливаем сохраненное состояние
    } else {
      // Если в localStorage ничего нет, устанавливаем состояние по умолчанию
      this.isSchoolDashboard = !this.router.url.includes('student');
      localStorage.setItem('isSchoolDashboard', JSON.stringify(this.isSchoolDashboard));
    }

    // Подписываемся на изменения состояния через сервис
    this.dashboardService.currentDashboard.subscribe((isSchoolDashboard) => {
      this.isSchoolDashboard = isSchoolDashboard;
      localStorage.setItem('isSchoolDashboard', JSON.stringify(this.isSchoolDashboard)); // Сохраняем изменения
    });
  }


  navigateTo(route: string): void {
    this.router.navigate([route], { relativeTo: this.route });
  }
}
