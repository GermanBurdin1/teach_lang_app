import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environment';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isSchoolDashboard = false;
  isTeacherDashboard = false;
  isStudentDashboard = false;
  private roleSub!: Subscription;
  
  // Sidebar collapse/expand functionality
  isExpanded = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private roleService: RoleService
  ) { }

  ngOnInit(): void {
    this.roleSub = this.authService.currentRole$.subscribe(role => {
      if (!environment.production) {
        console.log(`[Sidebar] Role changed to: ${role}`);
      }

      // Используем RoleService для определения типов dashboard
      this.isTeacherDashboard = this.roleService.isTeacher();
      this.isSchoolDashboard = this.roleService.isAdmin();
      this.isStudentDashboard = this.roleService.isStudent();

      if (!environment.production) {
        console.log(`[Sidebar] Flags — isTeacher: ${this.isTeacherDashboard}, isSchool: ${this.isSchoolDashboard}, isStudent: ${this.isStudentDashboard}`);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.roleSub) {
      this.roleSub.unsubscribe();
    }
  }

  navigateTo(route: string): void {
    if (!environment.production) {
      console.log(`[Sidebar] Navigating to: ${route}`);
    }
    this.router.navigate([route]);
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

