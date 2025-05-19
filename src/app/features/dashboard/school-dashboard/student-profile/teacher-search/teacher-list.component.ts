import { Component, OnInit } from '@angular/core';
import { TeacherService } from './teacher.service';
import { Teacher } from './teacher.model';

@Component({
  selector: 'app-teacher-list',
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.css']
})
export class TeacherListComponent implements OnInit {
  teachers: Teacher[] = [];
  total = 0;
  isLoading = false;

  page = 1;
  limit = 6;

  constructor(private teacherService: TeacherService) {}

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers() {
    this.isLoading = true;
    this.teacherService.getTeachers(this.page, this.limit).subscribe({
      next: (res) => {
        this.teachers = res.data;
        this.total = res.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  nextPage() {
    if ((this.page * this.limit) < this.total) {
      this.page++;
      this.loadTeachers();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadTeachers();
    }
  }

  get maxPage(): number {
    return Math.ceil(this.total / this.limit);
  }
}


