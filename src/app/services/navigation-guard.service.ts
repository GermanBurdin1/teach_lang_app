import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NavigationGuardService {
  private isGuardActive = false;

  constructor(
    private location: Location,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Активирует защиту навигации для личного кабинета
   */
  enableNavigationGuard(): void {
    if (this.isGuardActive) return;
    
    this.isGuardActive = true;
    
    // Добавляем состояние в историю, чтобы перехватить кнопку "назад"
    history.pushState(null, '', window.location.href);
    
    // Слушаем событие popstate (кнопка "назад")
    window.addEventListener('popstate', this.handleBackButton);
  }

  /**
   * Деактивирует защиту навигации
   */
  disableNavigationGuard(): void {
    if (!this.isGuardActive) return;
    
    this.isGuardActive = false;
    window.removeEventListener('popstate', this.handleBackButton);
  }

  /**
   * Обработчик кнопки "назад"
   */
  private handleBackButton = (event: PopStateEvent): void => {
    // Предотвращаем стандартное поведение
    history.pushState(null, '', window.location.href);
    
    // Показываем красивый Material Design SnackBar с двумя кнопками
    const snackBarRef = this.snackBar.open(
      'Voulez-vous vous déconnecter du système ?',
      '', // Пустой action text, так как будем использовать кастомный компонент
      {
        duration: 0, // Убираем автозакрытие, пользователь должен выбрать
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['logout-confirmation-snackbar']
      }
    );

    // Добавляем кнопки вручную через DOM
    const snackBarContainer = snackBarRef.containerInstance.snackBarConfig.viewContainerRef?.element.nativeElement || 
                              document.querySelector('.logout-confirmation-snackbar');
    
    if (snackBarContainer) {
      // Удаляем стандартную кнопку если есть
      const existingAction = snackBarContainer.querySelector('.mat-mdc-snack-bar-action');
      if (existingAction) {
        existingAction.remove();
      }

      // Создаем контейнер для кнопок
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'logout-buttons-container';
      buttonContainer.innerHTML = `
        <button class="logout-cancel-btn" type="button">Annuler</button>
        <button class="logout-confirm-btn" type="button">Se déconnecter</button>
      `;

      // Добавляем кнопки в SnackBar
      snackBarContainer.appendChild(buttonContainer);

      // Обработчики кнопок
      const cancelBtn = buttonContainer.querySelector('.logout-cancel-btn');
      const confirmBtn = buttonContainer.querySelector('.logout-confirm-btn');

      cancelBtn?.addEventListener('click', () => {
        snackBarRef.dismiss();
        // Остаемся на текущей странице
      });

      confirmBtn?.addEventListener('click', () => {
        snackBarRef.dismiss();
        // Пользователь подтвердил logout
        this.disableNavigationGuard();
        this.authService.logout();
        this.router.navigate(['/login']);
      });
    }
  };
}
