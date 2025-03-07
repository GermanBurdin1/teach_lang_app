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
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit: SidebarComponent is initializing...');

    // Читаем сохраненное состояние из localStorage
    const storedState = localStorage.getItem('isSchoolDashboard');
    console.log('Stored state from localStorage:', storedState);

    if (storedState !== null) {
      this.isSchoolDashboard = JSON.parse(storedState); // Устанавливаем сохраненное состояние
      console.log('isSchoolDashboard after parsing localStorage:', this.isSchoolDashboard);
    } else {
      // Если в localStorage ничего нет, устанавливаем состояние по умолчанию
      this.isSchoolDashboard = true; // По умолчанию школьная панель
      console.log('No stored state found. Setting default isSchoolDashboard to true (SchoolDashboard)');
      localStorage.setItem('isSchoolDashboard', JSON.stringify(this.isSchoolDashboard));
    }

    // Подписываемся на изменения состояния через сервис
    this.dashboardService.currentDashboard.subscribe((isSchoolDashboard) => {
      console.log('DashboardService emitted new state:', isSchoolDashboard);
      this.isSchoolDashboard = isSchoolDashboard;
      localStorage.setItem('isSchoolDashboard', JSON.stringify(this.isSchoolDashboard)); // Сохраняем изменения
    });
  }

  navigateTo(route: string): void {
    console.log('Navigating to route:', route);
    this.router.navigate([route], { relativeTo: this.route });
  }
}

