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
  daysWithDates: string[] = [];
  showButton: { [key: string]: boolean } = {};
  activeSlots: Record<string, boolean> = {};
  currentTimeSlot: { day: string; hour: string } | null = null;

  constructor(private route: ActivatedRoute) {
    this.currentWeekStart = this.getStartOfWeek(new Date());
  }

  ngOnInit(): void {
    this.teacherId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTeacherData();
    this.daysWithDates = this.getWeekDates().map(date => date.toISOString().split('T')[0]);
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

  toggleTimeSlot(day: string, hour: string) {
    const slotKey = `${day}-${hour}`;
    this.activeSlots[slotKey] = !this.activeSlots[slotKey];
  }

  showSelectButton(day: string, hour: string) {
    console.log("hello");
    this.showButton[`${day}-${hour}`] = true;
  }

  hideSelectButton(day: string, hour: string) {
    console.log("goodbye");
    this.showButton[`${day}-${hour}`] = false;
  }

  selectSlot(day: string, hour: string) {
    this.toggleTimeSlot(day, hour);
  }

  isTimeSlotActive(day: string, hour: string): boolean {
    return this.activeSlots[`${day}-${hour}`] || false;
  }

  isCurrentTime(day: string, hour: string): boolean {
    return this.currentTimeSlot?.day === day && this.currentTimeSlot?.hour === hour;
  }

  settingsMenuOpen = false;

  toggleSettingsMenu(): void {
    this.settingsMenuOpen = !this.settingsMenuOpen;
  }

}
