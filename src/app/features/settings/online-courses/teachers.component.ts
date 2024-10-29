import { Component } from '@angular/core';

@Component({
  selector: 'app-teachers',
  templateUrl: './teachers.component.html',
  styleUrls: ['./teachers.component.css']
})
export class TeachersComponent {
  teacherSettings = [
    { label: 'Редактировать рабочий график', tooltip: 'Опция для редактирования рабочего графика', enabled: true },
    { label: 'Создавать занятия', tooltip: 'Опция для создания занятий', enabled: false },
    { label: 'Изменять время занятия', tooltip: 'Опция для изменения времени занятия', enabled: true },
    { label: 'Отменять занятия', tooltip: 'Опция для отмены занятий', enabled: false },
    { label: 'Редактирование прошедших уроков', tooltip: 'Опция для редактирования прошедших уроков', enabled: true },
    { label: 'Доступ к каталогу материалов', tooltip: 'Опция для доступа к каталогу материалов', enabled: false },
  ];
}
