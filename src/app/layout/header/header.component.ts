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
  isPaymentModalOpen = false;
  amountToTopUp: number = 0;

  openBalanceModal(): void {
    this.showBalanceModal = true;
  }

  closeBalanceModal(): void {
    this.showBalanceModal = false;
  }

  payWithCard(): void {
    this.showBalanceModal = false;
    this.isPaymentModalOpen = true;
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen = false;
  }

  isDemoTourOpen = false;
  currentStep = 1;

  openDemoTour(): void {
    this.isDemoTourOpen = true;
    this.currentStep = 1; // Устанавливаем начальный шаг
  }

  closeDemoTour(): void {
    this.isDemoTourOpen = false;
  }

  nextStep(): void {
    if (this.currentStep < 10) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

}
