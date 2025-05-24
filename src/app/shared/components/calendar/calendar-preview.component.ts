import { Component, EventEmitter, Input, Output, TemplateRef} from '@angular/core';
import { CalendarView, CalendarEvent, CalendarDateFormatter} from 'angular-calendar';
import { Subject } from 'rxjs';
import { CustomDateFormatter } from './custom-date-formatter';

@Component({
  selector: 'app-calendar-preview',
  templateUrl: './calendar-preview.component.html',
  styleUrls: ['./calendar-preview.component.css'],
  providers: [
    {
      provide: CalendarDateFormatter,
      useClass: CustomDateFormatter 
    }
  ]
})

export class CalendarPreviewComponent {
  @Input() events: CalendarEvent[] = [];
  @Output() eventClicked = new EventEmitter<CalendarEvent>();
  @Input() eventTitleTemplate!: TemplateRef<any>;


  viewDate: Date = new Date();
  view: CalendarView = CalendarView.Week;
  refresh: Subject<void> = new Subject();

  ngOnInit(): void {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Сброс времени — обязательно!
    this.viewDate = today;
    console.log('[CalendarPreviewComponent] events received:', this.events);
    setTimeout(() => {
      this.refresh.next();
    });
  }

  onEventClick(event: CalendarEvent): void {
    console.log('[CalendarPreviewComponent] event clicked:', event);
    this.eventClicked.emit(event);
  }

  goToNextWeek(): void {
    const nextWeek = new Date(this.viewDate);
    nextWeek.setDate(this.viewDate.getDate() + 7);
    this.viewDate = nextWeek;
    this.refresh.next();
  }

  goToPreviousWeek(): void {
    const prevWeek = new Date(this.viewDate);
    prevWeek.setDate(this.viewDate.getDate() - 7);
    this.viewDate = prevWeek;
    this.refresh.next();
  }

}
