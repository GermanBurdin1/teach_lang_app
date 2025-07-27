// src/app/guards/auth-admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthAdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.authService.user;

    if (user && user.roles.includes('admin')) {
      return true;
    }

    // TODO : logger les tentatives d'accès non autorisées
    this.router.navigate(['/select-role']);
    return false;
  }
}
