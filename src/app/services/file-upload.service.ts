import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

export interface UploadedFile {
  id: number;
  filename: string;
  url: string;
  mimetype: string;
  courseId: string;
  createdAt: string;
  tag?: string;
  description?: string;
  courseLessonId?: string; // ID урока курса (course_lessons.id) - для обратной совместимости (первый урок)
  courseLessonIds?: string[]; // Массив ID уроков курса - many-to-many связь
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = `${API_ENDPOINTS.FILES}/upload`;
  private materialsUrl = `${API_ENDPOINTS.FILES}/materials`;

  constructor(private http: HttpClient) { }

  uploadFile(
    file: File,
    courseId?: number | null
  ): Observable<{ id: number; url: string; createdAt: string }> {
    const formData = new FormData();
    formData.append('file', file);

    //  если courseId передали и он не null – отправляем в FormData
    if (courseId !== undefined && courseId !== null) {
      formData.append('courseId', String(courseId));
    }

    return this.http.post<{ id: number; url: string; createdAt: string }>(
      `${this.apiUrl}`,
      formData
    );
  }

  uploadFileAsCourse(file: File, courseId: string, tag?: string, courseLessonId?: string): Observable<{ id: number; url: string; createdAt: string }> {
    const formData = new FormData();
    formData.append('file', file);

    let url = `${this.apiUrl}?courseId=${encodeURIComponent(courseId)}`;
    if (tag) {
      url += `&tag=${encodeURIComponent(tag)}`;
    }
    if (courseLessonId) {
      url += `&courseLessonId=${encodeURIComponent(courseLessonId)}`;
    }

    return this.http.post<{ id: number; url: string; createdAt: string }>(
      url,
      formData
    );
  }

  getFiles(courseId: string): Observable<UploadedFile[]> {
    // Используем endpoint для получения файлов курса
    return this.http.get<UploadedFile[]>(`${API_ENDPOINTS.FILES}?courseId=${encodeURIComponent(courseId)}`);
  }

  linkFileToCourse(fileUrl: string, courseId: number, tag?: string, courseLessonId?: string): Observable<{ id: number; url: string; createdAt: string }> {
    return this.http.post<{ id: number; url: string; createdAt: string }>(
      `${API_ENDPOINTS.FILES}/linkToCourse`,
      { fileUrl, courseId, tag, courseLessonId }
    );
  }

  deleteFile(fileId: number, courseId?: string): Observable<any> {
    // Если передан courseId, удаляем только связь с курсом
    // Иначе удаляем файл полностью
    let url = `${API_ENDPOINTS.FILES}/${fileId}`;
    if (courseId) {
      url += `?courseId=${encodeURIComponent(courseId)}`;
    }
    return this.http.delete(url);
  }

}
