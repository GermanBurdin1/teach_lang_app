import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

export interface Course {
  id: number;
  title: string;
  description: string | null;
  level: string | null;
  teacherId: string;
  isPublished: boolean;
  coverImage: string | null;
  sections: string[] | null;
  subSections?: { [key: string]: string[] } | null;
  lessons?: { [key: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } | null;
  lessonsInSubSections?: { [section: string]: { [subSection: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } } | null;
  createdAt: Date;
  updatedAt: Date;
  courseLessons?: any[];
}

export interface CreateCourseRequest {
  title: string;
  description?: string;
  level?: string;
  isPublished?: boolean;
}

export interface UpdateCourseRequest {
  title?: string;
  description?: string;
  level?: string;
  isPublished?: boolean;
  coverImage?: string | null;
  sections?: string[] | null;
  subSections?: { [key: string]: string[] } | null;
  lessons?: { [key: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } | null;
  lessonsInSubSections?: { [section: string]: { [subSection: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } } | null;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private baseUrl = API_ENDPOINTS.COURSES;

  constructor(private http: HttpClient) { }

  createCourse(courseData: CreateCourseRequest): Observable<Course> {
    return this.http.post<Course>(this.baseUrl, courseData);
  }

  getCoursesByTeacher(): Observable<Course[]> {
    return this.http.get<Course[]>(this.baseUrl);
  }

  getCourseById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.baseUrl}/${id}`);
  }

  updateCourse(id: number, courseData: UpdateCourseRequest): Observable<Course> {
    return this.http.put<Course>(`${this.baseUrl}/${id}`, courseData);
  }

  deleteCourse(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  uploadCoverImage(courseId: number, file: File): Observable<{ coverImage: string }> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post<{ coverImage: string }>(`${this.baseUrl}/${courseId}/cover`, formData);
  }

  updateCallLessonSettings(courseLessonId: string, plannedDurationMinutes: number | null): Observable<any> {
    return this.http.put(`${this.baseUrl}/call-lesson/${courseLessonId}/settings`, {
      plannedDurationMinutes
    });
  }
}

