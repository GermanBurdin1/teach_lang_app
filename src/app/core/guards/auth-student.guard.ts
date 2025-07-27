import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStudentGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
  const user = this.authService.user;
  const currentRole = this.authService.currentRole;

  if (user && currentRole === 'student') {
    return true;
  }

  // TODO : sauvegarder la route demandée pour redirection après connexion
  this.router.navigate(['/select-role']);
  return false;
}
}
