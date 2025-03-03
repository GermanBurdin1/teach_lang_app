import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tariffs',
  templateUrl: './tariffs.component.html',
  styleUrl: './tariffs.component.css'
})
export class TariffsComponent {
  onlineLessonsProduct = { name: 'Онлайн-уроки', description: 'Максимальное количество учеников: 50', price: 7500 };
  marathonsProduct = { name: 'Марафоны', description: 'Участие оплачивается отдельно', price: 750 };

  //заявки
isFormValid: boolean = false; // Добавлено свойство для проверки валидности формы
link: string = 'https://example.com'; // Ссылка для отображения в поле
showInvalidIcon: boolean = false;
constructor( private router: Router) { }
copyLink(): void {
  navigator.clipboard.writeText(this.link).then(
    () => {
      console.log('Ссылка скопирована в буфер обмена.');
    },
    (err) => {
      console.error('Ошибка при копировании ссылки: ', err);
    }
  );
}

}

