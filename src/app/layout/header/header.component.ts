import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isHeaderExpanded = false;

  toggleExpandHeader(): void {
    this.isHeaderExpanded = !this.isHeaderExpanded;
  }

  switchToAdmin(): void {
    // Логика для переключения на роль администратора
    alert('Переключение на администратора');
  }

  switchToStudent(): void {
    // Логика для переключения на роль ученика
    alert('Переключение на ученика');
  }

  // ajouter de l'argent
  showBalanceModal = false;

  openBalanceModal(): void {
    this.showBalanceModal = true;
  }

  closeBalanceModal(): void {
    this.showBalanceModal = false;
  }
}
