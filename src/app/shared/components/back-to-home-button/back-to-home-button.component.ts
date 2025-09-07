import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

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

  constructor(private router: Router, private location: Location) {}

  goToHome() {
    // Проверяем, есть ли история браузера (откуда пришли)
    const previousUrl = document.referrer;
    const currentHost = window.location.origin;
    
    // Если пришли с того же сайта и не с login/register, возвращаемся назад
    if (previousUrl && previousUrl.startsWith(currentHost)) {
      const referrerPath = new URL(previousUrl).pathname;
      if (!referrerPath.includes('/login') && !referrerPath.includes('/register') && 
          !referrerPath.includes('/data-rights') && !referrerPath.includes('/privacy-policy') && 
          !referrerPath.includes('/cookies-policy') && !referrerPath.includes('/terms')) {
        this.location.back();
        return;
      }
    }
    
    // Иначе идем на главную страницу по роли
    const homeRoutes = {
      student: '/cabinet/school/student/home',
      teacher: '/teacher/home',
      admin: '/cabinet/school/dashboard/admin/home'
    };

    this.router.navigate([homeRoutes[this.userRole]]);
  }
}
