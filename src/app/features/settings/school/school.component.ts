import { Component } from '@angular/core';

@Component({
  selector: 'app-school',
  templateUrl: './school.component.html',
  styleUrls: ['./school.component.css']
})
export class SchoolComponent {
  activeSchoolTab: string = 'general-settings'; // Начальная активная вкладка для школы
}
