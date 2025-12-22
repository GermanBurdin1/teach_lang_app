import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class MindmapRoleResolver implements Resolve<string> {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot): string {
    const user = this.authService.getCurrentUser();
    const currentRole = this.authService.currentRole;
    
    if (currentRole === 'student' || user?.roles?.includes('student')) {
      return 'student';
    }
    
    if (currentRole === 'teacher' || user?.roles?.includes('teacher')) {
      return 'teacher';
    }
    
    return 'teacher'; // default
  }
}



