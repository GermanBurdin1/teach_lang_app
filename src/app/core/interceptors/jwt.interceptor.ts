import { Injectable, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap, delay } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private refreshInProgress = false; // Флаг для предотвращения множественных запросов на обновление токена
  private retryRequests = new Set<string>(); // Отслеживаем запросы, которые уже были повторены
  
  constructor(private injector: Injector) {}

  private get authService(): AuthService {
    return this.injector.get(AuthService);
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Добавляем токен к запросу, если он есть
    const token = this.authService.getAccessToken();
    
    console.log('[JwtInterceptor] Request URL:', req.url);
    console.log('[JwtInterceptor] Token exists:', !!token);
    console.log('[JwtInterceptor] Token value:', token ? `${token.substring(0, 20)}...` : 'null');
    
    // Исключаем публичные эндпоинты из добавления Authorization заголовка
    const isPublicEndpoint = req.url.includes('/auth/login') || 
                           req.url.includes('/auth/register') || 
                           req.url.includes('/auth/refresh-token') ||
                           req.url.includes('/auth/check-email') ||
                           req.url.includes('/auth/confirm-email') ||
                           req.url.includes('/auth/resend-confirmation') ||
                           req.url.includes('/auth/teachers') ||
                           req.url.includes('/auth/users/');
    
    if (token && !isPublicEndpoint) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('[JwtInterceptor] Authorization header added');
    } else if (isPublicEndpoint) {
      console.log('[JwtInterceptor] Public endpoint, skipping Authorization header');
    } else {
      console.log('[JwtInterceptor] No token available, request will be sent without Authorization header');
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('[JwtInterceptor] Request failed:', {
          url: req.url,
          status: error.status,
          statusText: error.statusText
        });
        
        // Если получили 401 ошибку, пытаемся обновить токен
        if (error.status === 401 && token && !this.refreshInProgress && !this.retryRequests.has(req.url)) {
          console.log('[JwtInterceptor] Attempting token refresh for 401 error');
          this.refreshInProgress = true;
          this.retryRequests.add(req.url); // Помечаем запрос как повторённый
          
          return this.authService.refreshToken().pipe(
            switchMap((tokenResponse) => {
              console.log('[JwtInterceptor] Token refresh successful, retrying request');
              console.log('[JwtInterceptor] New access token:', tokenResponse.access_token ? tokenResponse.access_token.substring(0, 20) + '...' : 'null');
              this.refreshInProgress = false;
              this.retryRequests.clear(); // Очищаем список повторённых запросов после успешного обновления токена
              // Обновляем токен
              this.authService.updateAccessToken(tokenResponse.access_token);
              
              // Повторяем запрос с новым токеном
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokenResponse.access_token}`
                }
              });
              
              console.log('[JwtInterceptor] Retrying request with new token:', {
                url: newReq.url,
                hasAuthHeader: !!newReq.headers.get('Authorization'),
                oldToken: req.headers.get('Authorization') ? req.headers.get('Authorization')?.substring(0, 30) + '...' : 'none',
                newToken: newReq.headers.get('Authorization') ? newReq.headers.get('Authorization')?.substring(0, 30) + '...' : 'none',
                tokensAreDifferent: req.headers.get('Authorization') !== newReq.headers.get('Authorization')
              });
              
              // Добавляем небольшую задержку, чтобы дать время токену обновиться
              return next.handle(newReq).pipe(
                delay(100), // 100ms задержка
                tap((response) => {
                  console.log('[JwtInterceptor] Retry request successful:', {
                    url: newReq.url,
                    status: response.type
                  });
                }),
                catchError((retryError) => {
                  console.error('[JwtInterceptor] Retry request failed:', {
                    url: newReq.url,
                    status: retryError.status,
                    statusText: retryError.statusText
                  });
                  return throwError(() => retryError);
                })
              );
            }),
            catchError((refreshError) => {
              // Если обновление токена не удалось, разлогиниваем пользователя
              console.error('[JwtInterceptor] Token refresh failed:', refreshError);
              console.log('[JwtInterceptor] Logging out user due to refresh failure');
              this.refreshInProgress = false;
              this.retryRequests.delete(req.url); // Удаляем из списка повторённых запросов
              this.authService.logout();
              return throwError(() => refreshError);
            })
          );
        } else if (error.status === 401) {
          if (this.refreshInProgress) {
            console.log('[JwtInterceptor] 401 error but refresh already in progress, skipping');
          } else {
            console.log('[JwtInterceptor] 401 error but no token available, not attempting refresh');
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}
