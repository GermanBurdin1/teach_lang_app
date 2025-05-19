// teacher.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Teacher } from './teacher.model';
import { MOCK_TEACHERS } from './mock-teachers';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  constructor() {}

  getTeachers(page = 1, limit = 6): Observable<{ data: Teacher[], total: number }> {
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = MOCK_TEACHERS.slice(start, end);
    return of({ data, total: MOCK_TEACHERS.length });
  }
}
