import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface Lesson {
  date: string;
  time: string;
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
  activeTab = this.tabs[0];
  subTabs = ['Учитель', 'Классы', 'Личные материалы'];
  activeSubTab = this.subTabs[0];

  // Расписание уроков
  schedule: Lesson[] = [];
  currentWeekStart: Date;

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
    start.setDate(date.getDate() - date.getDay() + 1); // Start on Monday
    start.setHours(0, 0, 0, 0);
    return start;
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

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
  }

  addLesson(date: Date, time: string): void {
    const lesson: Lesson = { date: date.toDateString(), time };
    this.schedule.push(lesson);
  }
}

