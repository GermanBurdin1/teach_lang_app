import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  isSchoolDashboard = true;

  constructor(private router: Router, private route: ActivatedRoute, private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.currentDashboard.subscribe((isSchoolDashboard) => {
      this.isSchoolDashboard = isSchoolDashboard; // Обновляем состояние на основе сервиса
    });
  }

  navigateTo(route: string): void {
    console.log("navigateTo called with route:", route);
    this.router.navigate([route], { relativeTo: this.route });
  }

}
