import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-back-to-home-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="back-to-home-btn" (click)="goToHome()" [title]="title">
      <i class="fas fa-home"></i>
      <span>{{ label }}</span>
    </button>
  `,
  styleUrls: ['./back-to-home-button.component.css']
})
export class BackToHomeButtonComponent {
  @Input() userRole: 'student' | 'teacher' | 'admin' = 'student';
  @Input() label: string = 'Accueil';
  @Input() title: string = 'Retourner à la page d\'accueil';

  constructor(private router: Router) {}

  goToHome() {
    const homeRoutes = {
      student: '/cabinet/school/student/home',
      teacher: '/teacher/home',
      admin: '/cabinet/school/dashboard/admin/home'
    };

    this.router.navigate([homeRoutes[this.userRole]]);
  }
}
