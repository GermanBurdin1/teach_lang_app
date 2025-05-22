import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleComponent } from './components/schedule/schedule/schedule.component';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

import { CalendarPreviewComponent } from './components/calendar/calendar-preview.component';



@NgModule({
  declarations: [ScheduleComponent, CalendarPreviewComponent],
  imports: [
    CommonModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    })
  ],
  exports: [ScheduleComponent,CalendarPreviewComponent]
})
export class SharedModule { }
