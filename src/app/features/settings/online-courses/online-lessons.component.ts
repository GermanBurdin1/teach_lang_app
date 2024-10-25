import { Component } from '@angular/core';

@Component({
  selector: 'app-online-lessons',
  templateUrl: './online-lessons.component.html',
  styleUrls: ['./online-lessons.component.css']
})
export class OnlineLessonsComponent {
  activeOnlineTab: string = 'general-settings-online'; // Начальная активная вкладка для онлайн-уроков
}
