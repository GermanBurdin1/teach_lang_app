import { Component, OnInit } from '@angular/core';
import { LandingDataService } from '../landing-service/landing-data.service';

const defaultData = [
  {
    id: 'block1',
    title: 'Место для заголовка',
    subtitle: 'Место для подзаголовка',
    image: '', // или путь к изображению по умолчанию
    buttonText: 'Оставьте заявку',
    callToAction: 'Оставьте заявку на обучение',
  },
  {
    id: 'block2',
    title: 'Обо мне',
    subtitle: 'Краткое описание',
    links: {
      vk: 'http://vk.com/',
      facebook: 'http://fb.com/',
      instagram: 'http://instagram.com/',
      youtube: 'http://youtube.com/',
    },
  },
  // добавьте другие блоки по аналогии
];

@Component({
  selector: 'app-preview-landing',
  templateUrl: './preview-landing.component.html',
  styleUrls: ['./preview-landing.component.css']
})
export class PreviewLandingComponent implements OnInit {
  data: any[] = defaultData;

  constructor(private landingDataService: LandingDataService) {}

  ngOnInit(): void {
    const filledData = this.landingDataService.getAllData();
    if (filledData && filledData.length > 0) {
      this.data = filledData; // Заменяем дефолтные данные заполненными
    }
  }
}
