import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminTeacherService } from './admin-teacher.service';
import { AdminTeacher } from './admin-teacher.model';

@Component({
  selector: 'app-admin-teacher-details',
  templateUrl: './admin-teacher-details.component.html',
  styleUrls: ['./admin-teacher-details.component.css']
})
export class AdminTeacherDetailsComponent implements OnInit {
  teacher: AdminTeacher | null = null;

  constructor(
    private route: ActivatedRoute,
    private teacherService: AdminTeacherService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.teacherService.getTeacherById(id).subscribe(t => {
        this.teacher = t || null;
      });
    }
  }

  getFormattedDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

}
