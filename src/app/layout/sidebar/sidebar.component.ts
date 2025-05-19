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
  isTeacherDashboard = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    const storedSchool = localStorage.getItem('isSchoolDashboard');
    const storedTeacher = localStorage.getItem('isTeacherDashboard');

    if (storedSchool !== null) {
      this.isSchoolDashboard = JSON.parse(storedSchool);
    }

    if (storedTeacher !== null) {
      this.isTeacherDashboard = JSON.parse(storedTeacher);
    }

    this.dashboardService.currentDashboard.subscribe(isSchool => {
      this.isSchoolDashboard = isSchool;
    });

    this.dashboardService.currentTeacherDashboard.subscribe(isTeacher => {
      this.isTeacherDashboard = isTeacher;
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route], { relativeTo: this.route });
  }
}

