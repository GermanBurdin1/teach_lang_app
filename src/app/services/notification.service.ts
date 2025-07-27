import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

// TODO : ajouter templates de notifications prédéfinies
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  // notification de succès (verte)
  success(message: string, duration: number = 4000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-success']
    });
  }

  // notification d'erreur (rouge)
  error(message: string, duration: number = 6000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-error']
    });
  }

  // avertissement (orange)
  warning(message: string, duration: number = 5000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-warning']
    });
  }

  // notification informative (bleue)
  info(message: string, duration: number = 4000) {
    this.snackBar.open(message, '✕', {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-info']
    });
  }

  // notification avec action personnalisée
  actionNotification(message: string, action: string, duration: number = 5000) {
    return this.snackBar.open(message, action, {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-action']
    });
  }
} 