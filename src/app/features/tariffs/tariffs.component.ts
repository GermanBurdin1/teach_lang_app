import { Component } from '@angular/core';

@Component({
  selector: 'app-tariffs',
  templateUrl: './tariffs.component.html',
  styleUrl: './tariffs.component.css'
})
export class TariffsComponent {
  onlineLessonsProduct = { name: 'Онлайн-уроки', description: 'Максимальное количество учеников: 50', price: 7500 };
  marathonsProduct = { name: 'Марафоны', description: 'Участие оплачивается отдельно', price: 750 };
}
