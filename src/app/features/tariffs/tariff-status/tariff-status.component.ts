import { Component } from '@angular/core';

@Component({
  selector: 'app-tariff-status',
  templateUrl: './tariff-status.component.html',
})
export class TariffStatusComponent {
  showModal: boolean = false;
  showTariffModal: boolean = false;
  isProView: boolean = false;
  activeProIndex: number = -1;

  proPlans: { students: number; price: number }[] = [
    { students: 50, price: 7500 },
    { students: 100, price: 14500 },
    { students: 150, price: 21000 },
    { students: 200, price: 27500 },
    { students: 250, price: 33000 },
    { students: 300, price: 39000 }
  ];

  proPlanGroups: { students: number; price: number }[][] = [];

  constructor() {
    this.proPlanGroups = this.chunkArray(this.proPlans, 3);
  }

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
    this.activeProIndex = -1;
  }

  viewStandardTariff() {
    this.isProView = false;
    this.activeProIndex = -1;
  }

  viewProTariff() {
    this.isProView = true;
    this.activeProIndex = 0;
  }

  navigateCarousel(direction: string) {
    if (direction === 'next') {
      if (this.activeProIndex === -1) {
        // Переход от начального экрана к Pro тарифам
        this.activeProIndex = 0;
      } else {
        this.activeProIndex = (this.activeProIndex + 1) % this.proPlanGroups.length;
      }
    } else if (direction === 'prev') {
      if (this.activeProIndex === 0) {
        // Возврат к начальному экрану
        this.activeProIndex = -1;
      } else if (this.activeProIndex > 0) {
        this.activeProIndex = (this.activeProIndex - 1 + this.proPlanGroups.length) % this.proPlanGroups.length;
      }
    }
  }

  showAllFeatures() {
    alert('Показать все возможности тарифа Pro');
  }

  private chunkArray(array: { students: number; price: number }[], chunkSize: number): { students: number; price: number }[][] {
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }
}
