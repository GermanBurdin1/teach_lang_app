import { Component } from '@angular/core';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html'
})
export class BalanceComponent {
  isBalanceModalOpen = false;

  // Открыть модальное окно пополнения баланса
  openBalanceModal(): void {
    this.isBalanceModalOpen = true;
  }

  // Закрыть модальное окно пополнения баланса
  closeBalanceModal(): void {
    this.isBalanceModalOpen = false;
  }

  // Действие при нажатии на "Оплатить картой"
  payWithCard(): void {
    console.log('Платеж выполняется...');
    // Добавьте логику для обработки платежа
    this.closeBalanceModal(); // Закрываем модальное окно после выполнения платежа
  }
}
