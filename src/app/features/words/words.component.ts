import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.css']
})
export class WordsComponent {
  galaxies = [
    {
      name: 'Кругозор',
      sanitizedName: 'Кругозор'.replace(/\s+/g, '-'), // Убираем пробелы для id
      subtopics: this.generateSubtopics(6, ['История', 'Наука', 'Искусство', 'Философия', 'Технологии', 'Культура'])
    },
    {
      name: 'Социальные связи',
      sanitizedName: 'Социальные-связи'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(5, ['Семья', 'Друзья', 'Работа', 'Социальные сети', 'Коммуникация'])
    },
    {
      name: 'Работа и карьера',
      sanitizedName: 'Работа-и-карьера'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(4, ['Вакансии', 'Навыки', 'Резюме', 'Собеседование'])
    },
    {
      name: 'Предметы',
      sanitizedName: 'Предметы'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(6, ['Мебель', 'Техника', 'Инструменты', 'Одежда', 'Украшения', 'Игрушки'])
    },
    {
      name: 'Медицина и здоровье',
      sanitizedName: 'Медицина-и-здоровье'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(5, ['Болезни', 'Лечение', 'Профилактика', 'Здоровый образ жизни', 'Аптеки'])
    },
    {
      name: 'Ситуации и события',
      sanitizedName: 'Ситуации-и-события'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(4, ['Праздники', 'Катастрофы', 'Спорт', 'Политика'])
    }
  ];
  zoomedGalaxy: any = null;

  constructor(private router: Router) {}

  hoverGalaxy(galaxy: any) {
    // Можно добавить анимацию
  }

  hoverSubtopic(subtopic: any) {
    // Можно добавить эффект при наведении
  }

  zoomIntoGalaxy(galaxy: any) {
    this.zoomedGalaxy = galaxy;
  }

  resetZoom() {
    this.zoomedGalaxy = null;
  }

  generateSubtopics(count: number, names: string[]) {
    let subtopics = [];
    for (let i = 0; i < count; i++) {
      let angle = (i / count) * Math.PI * 2;
      let x = 100 + Math.cos(angle) * 90; // Используем радиус RX эллипса
      let y = 100 + Math.sin(angle) * 60; // Используем радиус RY эллипса

      subtopics.push({
        x,
        y,
        name: names[i]
      });
    }
    return subtopics;
  }



  onSubtopicClick(galaxyName: string, subtopicName: string) {
    this.router.navigate(['/student/wordsTeaching', galaxyName, subtopicName]); // <-- Редирект на страницу карточек
  }

}
