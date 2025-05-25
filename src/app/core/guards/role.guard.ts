import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const roles = route.data['roles'] as string[];
    const user = this.auth.getCurrentUser(); 

    if (user && user.roles?.some(role => roles.includes(role))) {
      console.log('[RoleGuard] User has required role:', user);
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
