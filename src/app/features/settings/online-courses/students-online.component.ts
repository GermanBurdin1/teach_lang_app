import { Component } from '@angular/core';

@Component({
  selector: 'app-students-online',
  templateUrl: './students-online.component.html',
  styleUrls: ['./students-online.component.css']
})
export class StudentsOnlineComponent {
  npsFrequency: string = 'never';

  studentSettings = [
    { label: 'Авто-деактивация учеников', tooltip: 'Настройка для автоматической деактивации', enabled: false },
    { label: 'Авто-активация учеников', tooltip: 'Настройка для автоматической активации', enabled: false },
    { label: 'Статистика в результатах урока', tooltip: 'Показывать статистику в результатах урока', enabled: true },
    { label: 'Рейтинг уроков в результатах урока', tooltip: 'Отображать рейтинг уроков', enabled: true }
  ];
}
