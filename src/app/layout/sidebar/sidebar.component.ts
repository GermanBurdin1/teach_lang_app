import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

// TODO : ajouter gestion de la barre latérale mobile et icônes personnalisées
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
  
  // fonctionnalité de réduction/expansion de la barre latérale
  isExpanded = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.roleSub = this.authService.currentRole$.subscribe(role => {
      console.log(`[Sidebar] Changement de rôle vers: ${role}`);

      this.isTeacherDashboard = role === 'teacher';
      this.isSchoolDashboard = role === 'admin';
      this.isStudentDashboard = role === 'student' || !role;

      console.log(`[Sidebar] Indicateurs — isTeacher: ${this.isTeacherDashboard}, isSchool: ${this.isSchoolDashboard}, isStudent: ${this.isStudentDashboard}`);
    });
  }

  ngOnDestroy(): void {
    this.roleSub.unsubscribe();
  }

  navigateTo(route: string): void {
    this.router.navigate([route], { relativeTo: this.route });
  }

  // étendre la barre latérale au survol
  expandSidebar(): void {
    this.isExpanded = true;
  }

  // réduire la barre latérale quand la souris quitte
  collapseSidebar(): void {
    this.isExpanded = false;
  }
}

