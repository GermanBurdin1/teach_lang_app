import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  price?: number;
  currency?: string;
  paymentMethod?: string;
  paymentDescription?: string;
  isFree?: boolean;
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
  price?: number;
  currency?: string;
  paymentMethod?: string;
  paymentDescription?: string;
  isFree?: boolean;
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

  updateCallLessonSettings(courseLessonId: string, plannedDurationMinutes: number | null, description?: string | null): Observable<any> {
    return this.http.put(`${this.baseUrl}/call-lesson/${courseLessonId}/settings`, {
      plannedDurationMinutes,
      description: description || null
    });
  }

  getCourseLessons(courseId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${courseId}/lessons`).pipe(
      catchError((error) => {
        // Если эндпоинт не существует (404), возвращаем пустой массив без ошибки
        if (error.status === 404) {
          // Не логируем ошибку, просто возвращаем пустой массив
          return of([]);
        }
        // Для других ошибок также возвращаем пустой массив
        console.warn('⚠️ [CourseService] Ошибка загрузки уроков курса:', error.status);
        return of([]);
      })
    );
  }
}

