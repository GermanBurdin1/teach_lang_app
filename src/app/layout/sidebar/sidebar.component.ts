import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  isSchoolDashboard = false;
  isTeacherDashboard = false;
  isStudentDashboard = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.currentRole;

    this.isTeacherDashboard = role === 'teacher';
    this.isSchoolDashboard = role === 'admin';
    this.isStudentDashboard = role === 'student' || !role; // fallback
  }

  navigateTo(route: string): void {
    this.router.navigate([route], { relativeTo: this.route });
  }
}

