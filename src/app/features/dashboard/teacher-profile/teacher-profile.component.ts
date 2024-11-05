import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-teacher-profile',
  templateUrl: './teacher-profile.component.html',
  styleUrls: ['./teacher-profile.component.css']
})
export class TeacherProfileComponent implements OnInit {
  teacherId: number | null = null;
  teacherData: any; // Структура данных учителя
  tabs = ['Онлайн-уроки', 'Марафоны', 'Администратор'];
  activeTab = this.tabs[0];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.teacherId = Number(this.route.snapshot.paramMap.get('id'));

    // Загрузка данных учителя по ID из локального хранилища
    const savedTeachers = localStorage.getItem('teachers');
    if (savedTeachers) {
      const teachers = JSON.parse(savedTeachers);
      this.teacherData = teachers.find((teacher: any) => teacher.id === this.teacherId);
    }
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }
}
