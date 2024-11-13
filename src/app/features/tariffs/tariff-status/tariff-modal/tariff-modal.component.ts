import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-tariff-modal',
  templateUrl: './tariff-modal.component.html'
})
export class TariffModalComponent {
  @Input() showTariffModal: boolean = false;
  @Output() closeTariffModalEvent = new EventEmitter<void>();

  showAllFeatures() {
    throw new Error('Method not implemented.');
  };

  activeIndex: number = 0;
  proFeatures = [
    { icon: 'icon-management', description: 'Инструменты управления учебным процессом' },
    { icon: 'icon-unlimited-teachers', description: 'Неограниченное кол-во учителей и администраторов' },
    { icon: 'icon-students', description: 'Возможность обучать любое кол-во учеников' },
    { icon: 'icon-white-label', description: 'Возможность подключить White Label и Рекламный блок' },
    { icon: 'icon-payments', description: 'Отслеживание количества оплаченных уроков и приём оплат' },
    { icon: 'icon-materials', description: 'Общая база материалов школы' }
  ];

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

  standardPlanGroups = this.chunkArray(this.standardPlans, 3);

  proPlanGroups = this.chunkArray(this.proPlans, 3);

  closeTariffModal(): void {
    this.showTariffModal = false;
    this.closeTariffModalEvent.emit();
  }

  viewStandardTariff(): void {
    this.activeIndex = -1;
  }

  viewProTariff(): void {
    this.activeIndex = 1;
  }

  navigateCarousel(direction: string): void {
    if (direction === 'next' && this.activeIndex < 3) {
      this.activeIndex++;
    } else if (direction === 'prev' && this.activeIndex > -3) {
      this.activeIndex--;
    }
  }

  isPrevDisabled(): boolean {
    return this.activeIndex === -3 || this.activeIndex === 0;
  }

  isNextDisabled(): boolean {
    return this.activeIndex === 3 || this.activeIndex === 0;
  }

  private chunkArray(array: { students: number; price: number }[], chunkSize: number) {
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }
}
