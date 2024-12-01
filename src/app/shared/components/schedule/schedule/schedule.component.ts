import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css'],
})
export class ScheduleComponent implements OnInit {
  currentWeekStart: Date = new Date();
  hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
  startHour: string = '09:00';
  endHour: string = '22:00';
  timezones = ['UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00', 'UTC+05:00', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'];
  showButton: { [key: string]: boolean } = {};
  activeSlots: Record<string, boolean> = {};
  currentTimeSlot: { day: string; hour: string } | null = null;
  daysWithDates: string[] = [];
  settingsMenuOpen = false;

  ngOnInit(): void {
    this.initializeDaysWithDates();
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 60000);
  }

  getWeekDates(): Date[] {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
  }

  toggleTimeSlot(day: string, hour: string): void {
    const slotKey = `${day}-${hour}`;
    this.activeSlots[slotKey] = !this.activeSlots[slotKey];
  }

  showSelectButton(day: string, hour: string): void {
    this.showButton[`${day}-${hour}`] = true;
  }

  hideSelectButton(day: string, hour: string): void {
    this.showButton[`${day}-${hour}`] = false;
  }

  selectSlot(day: string, hour: string): void {
    this.toggleTimeSlot(day, hour);
  }

  isTimeSlotActive(day: string, hour: string): boolean {
    return this.activeSlots[`${day}-${hour}`] || false;
  }

  isCurrentTime(day: string, hour: string): boolean {
    return this.currentTimeSlot?.day === day && this.currentTimeSlot?.hour === hour;
  }

  toggleSettingsMenu(): void {
    this.settingsMenuOpen = !this.settingsMenuOpen;
  }

  onStartHourChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.startHour = target.value;
    }
  }

  onEndHourChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.endHour = target.value;
    }
  }

  filterHours(): string[] {
    const startIndex = this.hours.indexOf(this.startHour);
    const endIndex = this.hours.indexOf(this.endHour);
    return this.hours.slice(startIndex, endIndex + 1);
  }

  initializeDaysWithDates(): void {
    const today = new Date();
    this.daysWithDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
      const dayDate = date.toLocaleDateString('ru-RU', { day: 'numeric' });
      this.daysWithDates.push(`${dayName}, ${dayDate}`);
    }
  }

  updateCurrentTime(): void {
    const now = new Date();
    const currentDay = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    const currentHour = `${now.getHours()}:00`;
    this.currentTimeSlot = { day: currentDay, hour: currentHour };
  }
}
