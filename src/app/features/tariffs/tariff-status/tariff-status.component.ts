import { Component } from '@angular/core';

@Component({
  selector: 'app-tariff-status',
  templateUrl: './tariff-status.component.html',
})
export class TariffStatusComponent {
  showAllFeatures() {
    throw new Error('Method not implemented.');
  }
  showModal: boolean = false;
  showTariffModal: boolean = false;
  isProView: boolean = false;
  activeIndex: number = 0; // 0: главный слайд, -1... для стандартных, 1... для Pro

  // Данные для стандартных тарифов
  standardPlans = [
    { students: 36, price: 3050 },
    { students: 30, price: 3410 },
    { students: 25, price: 3750 },
    { students: 20, price: 3050 },
    { students: 15, price: 3410 },
    { students: 10, price: 3750 },
    { students: 7, price: 3050 },
    { students: 5, price: 3410 },
    { students: 2, price: 3750 },
  ];

  // Данные для Pro тарифов
  proPlans = [
    { students: 50, price: 7500 },
    { students: 100, price: 14500 },
    { students: 150, price: 21000 },
    { students: 200, price: 27500 },
    { students: 250, price: 33000 },
    { students: 300, price: 39000 },
    { students: 400, price: 27500 },
    { students: 500, price: 33000 },
    { students: 600, price: 39000 },
  ];

  // Разделенные на группы для карусели
  standardPlanGroups = this.chunkArray(this.standardPlans, 3);
  proPlanGroups = this.chunkArray(this.proPlans, 3);

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
    this.activeIndex = 0; // Вернуться к главному слайду
  }

  viewStandardTariff() {
    this.activeIndex = -1; // Левый слайд с тарифами стандарт
  }

  viewProTariff() {
    this.activeIndex = 1; // Правый слайд с тарифами Pro
  }

  navigateCarousel(direction: string) {
    if (direction === 'next' && this.activeIndex < 3) { // Ограничение вправо на +3
      this.activeIndex++;
    } else if (direction === 'prev' && this.activeIndex > -3) { // Ограничение влево на -3
      this.activeIndex--;
    }
  }

  isPrevDisabled(): boolean {
    return this.activeIndex === -3 || this.activeIndex === 0; // Отключаем кнопку "влево" на крайнем левом (-3) и на главном (0)
  }

  isNextDisabled(): boolean {
    return this.activeIndex === 3 || this.activeIndex === 0; // Отключаем кнопку "вправо" на крайнем правом (+3) и на главном (0)
  }


  private chunkArray(array: { students: number; price: number }[], chunkSize: number) {
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }
}
