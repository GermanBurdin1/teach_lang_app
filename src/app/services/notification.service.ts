import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  // Успешное уведомление (зеленое)
  success(message: string, duration: number = 4000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-success']
    });
  }

  // Уведомление об ошибке (красное)
  error(message: string, duration: number = 6000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-error']
    });
  }

  // Предупреждение (оранжевое)
  warning(message: string, duration: number = 5000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-warning']
    });
  }

  // Информационное уведомление (синее)
  info(message: string, duration: number = 4000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-info']
    });
  }

  // Уведомление с пользовательским действием
  actionNotification(message: string, action: string, duration: number = 5000) {
    return this.snackBar.open(message, action, {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-action']
    });
  }
} 