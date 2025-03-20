import { Component } from '@angular/core';

@Component({
  selector: 'app-words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.css']
})
export class WordsComponent {
  galaxies = [
    {
      name: 'Кругозор',
      subtopics: this.generateSubtopics(6, ['История', 'Наука', 'Искусство', 'Философия', 'Технологии', 'Культура'])
    },
    {
      name: 'Социальные связи',
      subtopics: this.generateSubtopics(5, ['Семья', 'Друзья', 'Работа', 'Социальные сети', 'Коммуникация'])
    },
    {
      name: 'Работа и карьера',
      subtopics: this.generateSubtopics(4, ['Вакансии', 'Навыки', 'Резюме', 'Собеседование'])
    },
    {
      name: 'Предметы',
      subtopics: this.generateSubtopics(6, ['Мебель', 'Техника', 'Инструменты', 'Одежда', 'Украшения', 'Игрушки'])
    },
    {
      name: 'Медицина и здоровье',
      subtopics: this.generateSubtopics(5, ['Болезни', 'Лечение', 'Профилактика', 'Здоровый образ жизни', 'Аптеки'])
    },
    {
      name: 'Ситуации и события',
      subtopics: this.generateSubtopics(4, ['Праздники', 'Катастрофы', 'Спорт', 'Политика'])
    }
  ];
  zoomedGalaxy: any = null;

  constructor() {}

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
      let x = 100 + Math.cos(angle) * 50;
      let y = 100 + Math.sin(angle) * 50;

      subtopics.push({
        x,
        y,
        name: names[i]
      });
    }
    return subtopics;
  }

  onSubtopicClick(subtopic: any) {
    console.log(`Кликнуто на подтему: ${subtopic.name}`);
    // Тут можно добавить логику перехода
  }

}
