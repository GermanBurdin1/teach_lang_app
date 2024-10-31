import { Component } from '@angular/core';

@Component({
  selector: 'app-tariff-status',
  templateUrl: './tariff-status.component.html',
})
export class TariffStatusComponent {
  showModal: boolean = false;
  showTariffModal: boolean = false;
  isProView: boolean = false;
  activeProIndex: number = -1; // -1 для начального экрана

  proPlans = [
    { students: 50, price: 7500 },
    { students: 100, price: 14500 },
    { students: 150, price: 21000 },
  ];

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  openTariffModal() {
    this.showTariffModal = true;
    this.closeModal();
  }

  closeTariffModal() {
    this.showTariffModal = false;
    this.isProView = false;
    this.activeProIndex = -1; // Вернуться к начальному экрану
  }

  viewStandardTariff() {
    this.isProView = false;
    this.activeProIndex = -1; // Начальный экран
  }

  viewProTariff() {
    this.isProView = true;
    this.activeProIndex = 0; // Первый элемент Pro тарифов
  }

  navigateCarousel(direction: string) {
    if (direction === 'next') {
      if (this.activeProIndex < this.proPlans.length - 1) {
        this.activeProIndex++;
      } else {
        this.activeProIndex = -1; // Вернуться на начальный экран
      }
    } else if (direction === 'prev') {
      if (this.activeProIndex > -1) {
        this.activeProIndex--;
      } else {
        this.activeProIndex = this.proPlans.length - 1; // Переход к последнему Pro тарифу
      }
    }
  }

  showAllFeatures() {
    alert('Показать все возможности тарифа Pro');
  }
}
