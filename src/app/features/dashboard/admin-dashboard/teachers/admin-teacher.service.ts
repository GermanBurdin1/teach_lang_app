import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AdminTeacher } from './admin-teacher.model';
import { MOCK_TEACHERS_ADMIN } from './mock-admin-teachers';

@Injectable({
  providedIn: 'root'
})
export class AdminTeacherService {
  getTeachers(page = 1, limit = 6): Observable<{ data: AdminTeacher[], total: number }> {
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = MOCK_TEACHERS_ADMIN.slice(start, end);
    return of({ data, total: MOCK_TEACHERS_ADMIN.length });
  }
}

