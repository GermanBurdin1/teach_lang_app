import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AdminTeacher } from './admin-teacher.model';
import { MOCK_TEACHERS_ADMIN } from './mock-admin-teachers';
import { MOCK_ADMIN_TEACHER_DETAILS } from './mock-admin-teacher-details';
import { AdminTeacherDetails } from './admin-teacher-details.model';

// TODO : remplacer par des appels API réels
@Injectable({
  providedIn: 'root'
})
export class AdminTeacherService {
  
  // TODO : implémenter pagination côté serveur
  getTeachers(page = 1, limit = 6): Observable<{ data: AdminTeacher[], total: number }> {
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = MOCK_TEACHERS_ADMIN.slice(start, end);
    return of({ data, total: MOCK_TEACHERS_ADMIN.length });
  }

  getTeacherById(id: string): Observable<AdminTeacher | undefined> {
    const found = MOCK_TEACHERS_ADMIN.find(t => t.id === id);
    return of(found);
  }

  // TODO : intégrer API pour les détails enseignant
  getTeacherDetailsById(id: string): Observable<AdminTeacherDetails | undefined> {
    const found = MOCK_ADMIN_TEACHER_DETAILS.find(t => t.id === id);
    return of(found);
  }
}

