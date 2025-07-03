import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  isSchoolDashboard = false;
  isTeacherDashboard = false;
  isStudentDashboard = false;
  private roleSub!: Subscription;
  
  // Sidebar collapse/expand functionality
  isExpanded = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.roleSub = this.authService.currentRole$.subscribe(role => {
      console.log(`[Sidebar] Role changed to: ${role}`);

      this.isTeacherDashboard = role === 'teacher';
      this.isSchoolDashboard = role === 'admin';
      this.isStudentDashboard = role === 'student' || !role;

      console.log(`[Sidebar] Flags — isTeacher: ${this.isTeacherDashboard}, isSchool: ${this.isSchoolDashboard}, isStudent: ${this.isStudentDashboard}`);
    });
  }

  ngOnDestroy(): void {
    this.roleSub.unsubscribe();
  }

  navigateTo(route: string): void {
    this.router.navigate([route], { relativeTo: this.route });
  }

  // Expand sidebar on hover
  expandSidebar(): void {
    this.isExpanded = true;
  }

  // Collapse sidebar when mouse leaves
  collapseSidebar(): void {
    this.isExpanded = false;
  }
}

