import { Component } from '@angular/core';

@Component({
  selector: 'app-tariff-status',
  templateUrl: './tariff-status.component.html',
})
export class TariffStatusComponent {
  showModal: boolean = false;
  showTariffModal: boolean = false;
  isProView: boolean = false;
  activeProIndex: number = 0;

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
    this.activeProIndex = 0;
  }

  viewStandardTariff() {
    this.isProView = false;
  }

  viewProTariff() {
    this.isProView = true;
  }

  navigateCarousel(direction: string) {
    if (direction === 'next') {
      this.activeProIndex = (this.activeProIndex + 1) % this.proPlans.length;
    } else if (direction === 'prev') {
      this.activeProIndex = (this.activeProIndex - 1 + this.proPlans.length) % this.proPlans.length;
    }
  }

  showAllFeatures() {
    alert('Показать все возможности тарифа Pro');
  }
}

