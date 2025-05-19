// teacher.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MOCK_TEACHER_DETAILS } from './mock-teacher-details';
import { TeacherDetails } from './teacher-details.model';
import { Teacher } from './teacher.model';
import { MOCK_TEACHERS } from './mock-teachers';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  constructor() { }

  getTeachers(page = 1, limit = 6): Observable<{ data: Teacher[], total: number }> {
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = MOCK_TEACHERS.slice(start, end);
    return of({ data, total: MOCK_TEACHERS.length });
  }

  getTeacherById(id: string): Observable<TeacherDetails | undefined> {
    const found = MOCK_TEACHER_DETAILS.find(t => t.id === id);
    return of(found);
  }
}
