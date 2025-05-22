import { Component, Input, TemplateRef } from '@angular/core';
import { CalendarView, CalendarEvent } from 'angular-calendar';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-calendar-preview',
  templateUrl: './calendar-preview.component.html',
  styleUrls: ['./calendar-preview.component.css']
})
export class CalendarPreviewComponent {
  @Input() events: CalendarEvent[] = [];
  @Input() eventTemplate!: TemplateRef<any>;

  viewDate: Date = new Date();
  view: CalendarView = CalendarView.Week;
  refresh: Subject<void> = new Subject();

  ngOnInit(): void {
    setTimeout(() => {
      this.refresh.next(); // или this.viewDate = ... если нужно переинициализировать
    });
  }
}
