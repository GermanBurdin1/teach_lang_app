import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(): boolean {
    // Проверяем, авторизован ли пользователь
    const user = this.authService.getCurrentUser();
    const hasToken = !!localStorage.getItem('access_token');
    
    if (user && hasToken) {
      return true;
    }
    
    // Если не авторизован, перенаправляем на логин
    this.router.navigate(['/login']);
    return false;
  }
}
