import { Component } from '@angular/core';

@Component({
  selector: 'app-tariff-status',
  templateUrl: './tariff-status.component.html'
})
export class TariffStatusComponent {
  showModal: boolean = false;
  showTariffModal: boolean = false;

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  openTariffModal() {
    this.showTariffModal = true;
    this.closeModal(); // Закрыть первое окно при открытии второго
  }

  closeTariffModal() {
    this.showTariffModal = false;
  }

  selectProTariff() {
    const carousel = document.querySelector('#tariffCarousel') as HTMLElement;
    if (carousel) {
      carousel.dispatchEvent(new Event('slide'));
    }
  }

  showAllFeatures() {
    // Логика для показа всех возможностей тарифа
  }
}

