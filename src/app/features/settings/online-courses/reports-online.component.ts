import { Component } from '@angular/core';

@Component({
  selector: 'app-reports-online',
  templateUrl: './reports-online.component.html',
  styleUrls: ['./reports-online.component.css']
})
export class ReportsOnlineComponent {
  showModal = false;

  days = Array.from({ length: 31 }, (_, i) => i + 1);
  months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  startDay = this.days[0];
  startMonth = this.months[0];
  startYear = this.years[0];
  endDay = this.days[0];
  endMonth = this.months[0];
  endYear = this.years[0];
  studentStatus = 'Активирован';

  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }
}
