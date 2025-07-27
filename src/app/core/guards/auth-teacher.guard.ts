// src/app/guards/auth-teacher.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthTeacherGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.authService.user;
    const currentRole = this.authService.currentRole;

    if (user && currentRole === 'teacher') {
      return true;
    }

    // TODO : rediriger vers une page spécifique pour les enseignants
    this.router.navigate(['/select-role']);
    return false;
  }
}
