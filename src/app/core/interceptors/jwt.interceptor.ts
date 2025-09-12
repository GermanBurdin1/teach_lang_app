import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Добавляем токен к запросу, если он есть
    const token = this.authService.getAccessToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Если получили 401 ошибку, пытаемся обновить токен
        if (error.status === 401 && token) {
          return this.authService.refreshToken().pipe(
            switchMap((tokenResponse) => {
              // Обновляем токен
              this.authService.updateAccessToken(tokenResponse.access_token);
              
              // Повторяем запрос с новым токеном
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokenResponse.access_token}`
                }
              });
              
              return next.handle(newReq);
            }),
            catchError((refreshError) => {
              // Если обновление токена не удалось, разлогиниваем пользователя
              console.error('[JwtInterceptor] Token refresh failed:', refreshError);
              this.authService.logout();
              return throwError(() => refreshError);
            })
          );
        }
        
        return throwError(() => error);
      })
    );
  }
}
