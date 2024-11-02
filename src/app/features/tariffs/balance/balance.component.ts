import { Component } from '@angular/core';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html'
})
export class BalanceComponent {
  isBalanceModalOpen = false;
  isPaymentModalOpen = false;

  // Открыть модальное окно пополнения баланса
  openBalanceModal(): void {
    this.isBalanceModalOpen = true;
  }

  // Закрыть модальное окно пополнения баланса
  closeBalanceModal(): void {
    this.isBalanceModalOpen = false;
  }

  // Открыть модальное окно оплаты
  payWithCard(): void {
    this.isBalanceModalOpen = false;
    this.isPaymentModalOpen = true;
  }

  // Закрыть модальное окно оплаты
  closePaymentModal(): void {
    this.isPaymentModalOpen = false;
  }
}
