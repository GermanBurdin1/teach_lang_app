import { Injectable } from '@angular/core';
import { CalendarDateFormatter, DateFormatterParams } from 'angular-calendar';
import { formatDate } from '@angular/common';

@Injectable()
export class CustomDateFormatter extends CalendarDateFormatter {
  override weekViewHour({ date, locale }: DateFormatterParams): string {
    return formatDate(date, 'HH:mm', locale || 'fr'); // ⬅️ fallback на 'fr'
  }
}
