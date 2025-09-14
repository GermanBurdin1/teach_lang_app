import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

export interface GroupClass {
  id: string;
  name: string;
  level: string | null;
  description: string | null;
  maxStudents: number;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  students: GroupClassStudent[];
}

export interface GroupClassStudent {
  id: string;
  studentId: string;
  studentName: string | null;
  addedAt: Date;
  status: 'active' | 'removed' | 'completed';
}

export interface CreateGroupClassDto {
  name: string;
  level?: string;
  description?: string;
  maxStudents?: number;
  teacherId: string;
  scheduledAt: string;
}

export interface AddStudentToClassDto {
  groupClassId: string;
  studentId: string;
  studentName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroupClassService {
  private readonly baseUrl = API_ENDPOINTS.LESSONS;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  createGroupClass(createDto: CreateGroupClassDto): Observable<GroupClass> {
    return this.http.post<GroupClass>(
      `${this.baseUrl}/group-classes`,
      createDto,
      { headers: this.getHeaders() }
    );
  }

  getTeacherGroupClasses(teacherId: string): Observable<GroupClass[]> {
    return this.http.get<GroupClass[]>(
      `${this.baseUrl}/group-classes/teacher/${teacherId}`,
      { headers: this.getHeaders() }
    );
  }

  addStudentToClass(addStudentDto: AddStudentToClassDto): Observable<GroupClassStudent> {
    return this.http.post<GroupClassStudent>(
      `${this.baseUrl}/group-classes/students`,
      addStudentDto,
      { headers: this.getHeaders() }
    );
  }

  removeStudentFromClass(classId: string, studentId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/group-classes/${classId}/students/${studentId}`,
      { headers: this.getHeaders() }
    );
  }

  updateGroupClass(id: string, updateData: Partial<CreateGroupClassDto>): Observable<GroupClass> {
    return this.http.put<GroupClass>(
      `${this.baseUrl}/group-classes/${id}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

  deleteGroupClass(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/group-classes/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
