import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface Lesson {
  day: string;
  hour: string;
  topic?: string; // Дополнительные свойства урока, если нужны
}

@Component({
  selector: 'app-teacher-profile',
  templateUrl: './teacher-profile.component.html',
  styleUrls: ['./teacher-profile.component.css']
})
export class TeacherProfileComponent implements OnInit {
  teacherId: number | null = null;
  teacherData: any;
  tabs = ['Онлайн-уроки', 'Марафоны', 'Администратор'];
  subTabs = ['Учитель', 'Классы', 'Личные материалы'];
  activeTab: string = this.tabs[0];
  activeSubTab: string = this.subTabs[0];

  schedule: Lesson[] = [];
  currentWeekStart: Date = new Date();

  hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
  showButton: string | null = null;
  activeSlots: Record<string, boolean> = {};

  constructor(private route: ActivatedRoute) {
    this.currentWeekStart = this.getStartOfWeek(new Date());
  }

  ngOnInit(): void {
    this.teacherId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTeacherData();
  }

  loadTeacherData(): void {
    const savedTeachers = localStorage.getItem('teachers');
    if (savedTeachers) {
      const teachers = JSON.parse(savedTeachers);
      this.teacherData = teachers.find((teacher: any) => teacher.id === this.teacherId);
    }
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  switchSubTab(subTab: string): void {
    this.activeSubTab = subTab;
  }

  getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Начало недели - понедельник
    return new Date(start.setDate(diff));
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

  showSelectButton(day: Date, hour: string): void {
    this.showButton = `${day}-${hour}`;
  }

  hideSelectButton(): void {
    this.showButton = null;
  }

  selectSlot(day: Date, hour: string): void {
    const slotKey = `${day}-${hour}`;
    this.activeSlots[slotKey] = !this.activeSlots[slotKey];
    this.showButton = null;
  }

  isTimeSlotActive(day: Date, hour: string): boolean {
    const slotKey = `${day}-${hour}`;
    return this.activeSlots[slotKey] || false;
  }

  isCurrentTime(day: Date, hour: string): boolean {
    const now = new Date();
    const currentDay = day.toDateString() === now.toDateString();
    const currentHour = hour === `${now.getHours()}:00`;
    return currentDay && currentHour;
  }
}
